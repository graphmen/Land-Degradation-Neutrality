"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { downloadFile, convertToKML, convertToCSV } from "@/lib/export";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const HIDDEN = new Set([
  "uuid", "start", "end", "deviceid", "today", "meta", "__version__",
  "_xform_id_string", "_bamboo_dataset_id", "_attachments"
]);

function normalise(r: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(r)) {
    out[k] = v;
    if (k.includes("/") && !k.startsWith("_")) {
      const s = k.split("/").pop()!;
      if (!(s in out)) out[s] = v;
    }
  }
  return out;
}

function extractGeo(r: any): [number, number] | null {
  const g = r._geolocation;
  if (Array.isArray(g) && g.length >= 2 && g[0] != null) return [+g[0], +g[1]];
  for (const k of ["GPS", "gps", "location", "geopoint"]) {
    const v = r[k];
    if (typeof v === "string") {
      const p = v.trim().split(/\s+/);
      if (p.length >= 2 && !isNaN(+p[0]) && !isNaN(+p[1])) return [+p[0], +p[1]];
    }
  }
  return null;
}

async function fetchAllRecords(): Promise<any[]> {
  try {
    const res = await fetch("/api/ldn?limit=5000", { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.records ?? []).map(normalise);
  } catch (e) {
    return [];
  }
}

function buildDashboardData(records: any[]) {
  const landuseCnt: Record<string, number> = {};
  const districtCnt: Record<string, number> = {};
  const severityCnt: Record<string, number> = {};
  const features: any[] = [];
  const landUses = new Set<string>();

  for (const r of records) {
    if (r.landus) {
      landuseCnt[r.landus] = (landuseCnt[r.landus] || 0) + 1;
      landUses.add(r.landus);
    }
    if (r.dist) districtCnt[r.dist] = (districtCnt[r.dist] || 0) + 1;
    if (r.sev) severityCnt[r.sev] = (severityCnt[r.sev] || 0) + 1;

    const geo = extractGeo(r);
    if (geo) {
      const props: any = { _id: r._id };
      for (const [k, v] of Object.entries(r))
        if (!k.startsWith("_") && !k.includes("/") && !HIDDEN.has(k)) props[k] = v;
      features.push({ type: "Feature", geometry: { type: "Point", coordinates: [geo[1], geo[0]] }, properties: props });
    }
  }

  return {
    records,
    geojson: { type: "FeatureCollection", features, total: features.length },
    kpis: {
      total_monitors: records.length,
      mapped_points: features.length,
      land_uses: Object.keys(landuseCnt).length,
      active_districts: Object.keys(districtCnt).length,
    },
    charts: {
      by_severity: Object.entries(severityCnt).map(([name, value]) => ({ name, value })),
    },
    landUses: Array.from(landUses).sort(),
  };
}

export default function LdnPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [landuseFilter, setLanduseFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = () => {
    setLoading(true);
    fetchAllRecords()
      .then((records) => {
        const parsed = buildDashboardData(records);
        setData(parsed);
        if (parsed.geojson.features.length > 0) {
          setActiveId(parsed.geojson.features[0].properties._id);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ borderTopColor: "var(--accent-blue)" }} />
        <div style={{ color: "#64748b", fontSize: 13 }}>Loading LDN Framework…</div>
      </div>
    );

  const { kpis, geojson, charts, landUses } = data;

  const filteredFeatures = geojson.features.filter((f: any) => {
    const props = f.properties;
    const district = String(props.dist || "").toLowerCase();
    const ward = String(props.ward || "").toLowerCase();
    const ceid = String(props.ceid || "").toLowerCase();
    const landus = String(props.landus || "").toLowerCase();
    const searchLower = search.toLowerCase();

    const matchSearch = 
      district.includes(searchLower) || 
      ward.includes(searchLower) || 
      ceid.includes(searchLower) || 
      landus.includes(searchLower);

    const severity = (props.sev || "").toLowerCase();
    const matchSeverity = severityFilter === "all" || severity.includes(severityFilter);
    const matchLanduse = landuseFilter === "all" || props.landus === landuseFilter;

    return matchSearch && matchSeverity && matchLanduse;
  });

  const handleExport = () => {
    const format = (document.getElementById("ldn-export-format") as HTMLSelectElement)?.value || "csv";
    const { records } = data;
    
    if (format === "geojson") {
      const geojsonObj = {
        type: "FeatureCollection",
        features: filteredFeatures
      };
      const geojsonStr = JSON.stringify(geojsonObj, null, 2);
      downloadFile(geojsonStr, `ldn_data_export_${Date.now()}.geojson`, "application/json");
    } else if (format === "kml") {
      const kmlStr = convertToKML(filteredFeatures, "Zimbabwe LDN Data Export");
      downloadFile(kmlStr, `ldn_data_export_${Date.now()}.kml`, "application/vnd.google-earth.kml+xml");
    } else {
      const filteredIdSet = new Set(filteredFeatures.map((f: any) => f.properties._id));
      const filteredOriginalRecords = records.filter((r: any) => filteredIdSet.has(r._id));
      const csvStr = convertToCSV(filteredOriginalRecords);
      downloadFile(csvStr, `ldn_data_export_${Date.now()}.csv`, "text/csv;charset=utf-8;");
    }
  };

  // Pagination (10 per page)
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredFeatures.length / itemsPerPage));
  const currentFeatures = filteredFeatures.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeFeature = geojson.features.find((f: any) => f.properties._id === activeId);

  // Severity badge classes
  const getBadgeClass = (severity: string) => {
    const s = (severity || "").toLowerCase();
    if (s.includes("high") || s.includes("severe")) return "danger-status";
    if (s.includes("moderate") || s.includes("medium")) return "warning-status";
    return "active-status"; // low or minimal
  };

  const exportPanel = (
    <div className="sidebar-export-panel">
      <div className="sidebar-export-panel-title">Export Dataset</div>
      <div className="sidebar-export-field">
        <label htmlFor="ldn-export-format" className="sidebar-export-label">Format</label>
        <select id="ldn-export-format" className="sidebar-export-select">
          <option value="csv">CSV</option>
          <option value="geojson">GeoJSON</option>
          <option value="kml">KML (Google Earth)</option>
        </select>
      </div>
      <button 
        className="sidebar-export-btn" 
        onClick={handleExport}
        style={{ background: "var(--accent-blue)" }}
      >
        <span>📥</span> Download Data ({filteredFeatures.length})
      </button>
    </div>
  );

  return (
    <div className="buims-container">
      {/* Panel 2: List Panel */}
      <div className={`buims-list-panel ${leftCollapsed ? "collapsed" : ""}`}>
        <div className="panel-header">
          <div className="panel-title" style={{ color: "var(--accent-blue)" }}>
            <span>🌳</span> LDN Monitors
          </div>
          <div className="search-box">
            <input
              placeholder="Search district, ward..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="quick-filters">
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Severities</option>
              <option value="high">High Severity</option>
              <option value="mod">Moderate</option>
              <option value="low">Low Severity</option>
            </select>
            <select
              value={landuseFilter}
              onChange={(e) => {
                setLanduseFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Land Cover</option>
              {landUses.map((u: string) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="list-scroll">
          {currentFeatures.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 11, padding: 20 }}>
              No degradation points found.
            </div>
          ) : (
            currentFeatures.map((f: any) => {
              const props = f.properties;
              const district = props.dist || "Unspecified District";
              const ward = props.ward || "Unspecified Ward";
              const severity = props.sev || "Not Rated";
              const ceid = props.ceid || "—";
              const isSelected = activeId === props._id;

              return (
                <div
                  key={props._id}
                  className={`site-card ${isSelected ? "active" : ""}`}
                  onClick={() => setActiveId(props._id)}
                >
                  <div className="site-card-title">{district} • Ward {ward}</div>
                  <div className="site-card-subtitle">ID: {ceid}</div>
                  <div className="site-card-meta">
                    <span>🌿 {props.landus || "Unknown"}</span>
                    <span className={`site-badge ${getBadgeClass(severity)}`}>
                      {severity}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="list-pagination">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Left divider collapse toggle */}
      <button
        className={`panel-toggle-btn left-toggle ${leftCollapsed ? "collapsed" : ""}`}
        onClick={() => setLeftCollapsed(!leftCollapsed)}
        title={leftCollapsed ? "Expand site list" : "Collapse site list"}
      >
        {leftCollapsed ? "»" : "«"}
      </button>

      {/* Panel 3: Center Map Panel */}
      <div className="buims-map-panel">
        <MapView geojson={geojson} activeId={activeId} />
      </div>

      {/* Right divider collapse toggle */}
      <button
        className={`panel-toggle-btn right-toggle ${rightCollapsed ? "collapsed" : ""}`}
        onClick={() => setRightCollapsed(!rightCollapsed)}
        title={rightCollapsed ? "Expand details" : "Collapse details"}
      >
        {rightCollapsed ? "«" : "»"}
      </button>

      {/* Panel 4: Right Detail/Command Panel */}
      <div className={`buims-detail-panel ${rightCollapsed ? "collapsed" : ""}`}>
        {/* Network Snapshot Section */}
        <div className="detail-section">
          <div className="detail-section-title">Network Snapshot</div>
          <div className="snapshot-grid">
            <div className="snapshot-card">
              <div className="snapshot-lbl">Monitors</div>
              <div className="snapshot-val" style={{ color: "var(--accent-blue)" }}>
                {kpis.total_monitors}
              </div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Mapped</div>
              <div className="snapshot-val">{kpis.mapped_points}</div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Districts</div>
              <div className="snapshot-val">{kpis.active_districts}</div>
            </div>
          </div>
        </div>

        {/* Selected Site Details Section */}
        <div className="detail-section" style={{ flex: 1, overflowY: "auto" }}>
          <div className="detail-section-title">LDN Command</div>
          {activeFeature ? (
            (() => {
              const props = activeFeature.properties;
              const [lng, lat] = activeFeature.geometry.coordinates;
              const severity = props.sev || "Not Rated";
              const district = props.dist || "Unspecified District";
              const ward = props.ward || "Unspecified Ward";

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div className="detail-site-name">{district}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Ward: {ward}</div>
                    <span className={`site-badge ${getBadgeClass(severity)}`}>{severity} Severity</span>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>
                      {severity.toLowerCase().includes("high") || severity.toLowerCase().includes("severe")
                        ? "⚠️ High / Severe: Critical degradation or cover loss. Requires immediate field intervention."
                        : severity.toLowerCase().includes("moderate") || severity.toLowerCase().includes("medium")
                        ? "⚡ Moderate: Moderate degradation signs. Target with active soil conservation."
                        : "🌱 Low / Minimal: Stable or recovering land cover. Maintain baseline protection."}
                    </div>
                    {/* Zimbabwe SDG Target 15.3 context */}
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, padding: "8px 10px", background: "rgba(6, 75, 34, 0.05)", borderRadius: 6, borderLeft: "3px solid var(--accent-blue)", lineHeight: 1.4 }}>
                      <strong>Zimbabwe SDG 15.3 Alignment:</strong> In accordance with SDG Target 15.3.1, the Environmental Management Agency monitors these hotspots to implement reclamation strategies and achieve national Land Degradation Neutrality (LDN) by 2030.
                    </div>
                  </div>

                  <div className="detail-item-list">
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">🗺️</span> Monitored District
                      </span>
                      <span className="detail-item-value">{props.dist || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">📍</span> Electoral Ward
                      </span>
                      <span className="detail-item-value">Ward {props.ward || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">⚠️</span> Degradation Severity Level
                      </span>
                      <span className="detail-item-value">{severity || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">🌿</span> Land Use/Land Cover (LULC)
                      </span>
                      <span className="detail-item-value">{props.landus || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">🏡</span> Local Ward Name
                      </span>
                      <span className="detail-item-value">{props.localname || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">👤</span> Field Surveyor
                      </span>
                      <span className="detail-item-value">{props.agent || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">🌐</span> Latitude (GIS Coordinate)
                      </span>
                      <span className="detail-item-value">{lat.toFixed(6)}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">🌐</span> Longitude (GIS Coordinate)
                      </span>
                      <span className="detail-item-value">{lng.toFixed(6)}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">📅</span> Telemetry Date
                      </span>
                      <span className="detail-item-value">
                        {props._submission_time ? new Date(props._submission_time).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>

                  {/* LDN Context Guide Card */}
                  <div className="detail-explanation-card" style={{ borderLeftColor: "var(--accent-blue)" }}>
                    <div className="detail-explanation-title" style={{ color: "var(--accent-blue)" }}>
                      <span>🌍</span> SDG Indicator 15.3.1 Context
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, lineHeight: 1.4 }}>
                      Severity measures the rate of soil degradation and vegetation health.
                      <strong> Severe</strong> locations require immediate afforestation, soil conservation, and gully reclamation efforts.
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: 11 }}>No active LDN point selected</div>
          )}
        </div>

        {/* Distribution Panel */}
        {charts.by_severity && charts.by_severity.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">Severity Distribution</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {charts.by_severity.map((item: any, idx: number) => {
                const total = geojson.total;
                const percent = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                      <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--accent-blue)" }}>
                        {item.value} ({percent.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.03)", borderRadius: 2, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${percent}%`,
                          background: "linear-gradient(90deg, #2563eb, #3b82f6)",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {/* Action Panel */}
        <div className="detail-section">
          <div className="detail-section-title">System Actions</div>
          <button className="action-btn-danger" onClick={() => alert("Action restricted: administrator access required")}>
            Archive Survey Record
          </button>
        </div>
      </div>
      {mounted && typeof document !== "undefined" && document.getElementById("sidebar-export-container") ? (
        createPortal(exportPanel, document.getElementById("sidebar-export-container")!)
      ) : null}
    </div>
  );
}
