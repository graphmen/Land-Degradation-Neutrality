"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { downloadFile, convertToKML, convertToCSV } from "@/lib/export";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";

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
  const [viewMode, setViewMode] = useState<"spatial" | "dashboard">("spatial");
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [unccdFilter, setUnccdFilter] = useState("all");
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

  const { kpis, geojson, charts, landUses } = data || {
    kpis: { total_monitors: 0, active_districts: 0, land_uses: 0, mapped_points: 0 },
    geojson: { type: "FeatureCollection", features: [], total: 0 },
    charts: { by_severity: [] },
    landUses: []
  };

  const filteredFeatures = useMemo(() => {
    if (!geojson || !geojson.features) return [];
    return geojson.features.filter((f: any) => {
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

      const isHotspot = severity.includes("high") || severity.includes("severe") || severity.includes("critical");
      const isBrightSpot = severity.includes("low") || severity.includes("minimal") || severity.includes("stable") || severity.includes("none");
      const matchUnccd = unccdFilter === "all" || 
                         (unccdFilter === "hotspot" && isHotspot) || 
                         (unccdFilter === "brightspot" && isBrightSpot);

      return matchSearch && matchSeverity && matchLanduse && matchUnccd;
    });
  }, [geojson.features, search, severityFilter, landuseFilter, unccdFilter]);

  // Pagination (10 per page)
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredFeatures.length / itemsPerPage));
  const currentFeatures = filteredFeatures.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeFeature = geojson.features.find((f: any) => f.properties._id === activeId);

  const dashboardStats = useMemo(() => {
    if (!data) return null;
    const records = filteredFeatures.map(f => f.properties);
    const total = records.length;
    
    const landuseCnt: Record<string, number> = {};
    const districtCnt: Record<string, number> = {};
    const severityCnt: Record<string, number> = {};
    let hotspots = 0;
    let brightspots = 0;

    records.forEach(r => {
      const lu = r.landus || "Unknown";
      landuseCnt[lu] = (landuseCnt[lu] || 0) + 1;
      
      const dist = r.dist || "Unknown";
      districtCnt[dist] = (districtCnt[dist] || 0) + 1;
      
      const sev = r.sev || "Unknown";
      severityCnt[sev] = (severityCnt[sev] || 0) + 1;

      const sevLower = sev.toLowerCase();
      if (sevLower.includes("high") || sevLower.includes("severe") || sevLower.includes("critical")) {
        hotspots++;
      } else if (sevLower.includes("low") || sevLower.includes("minimal") || sevLower.includes("stable") || sevLower.includes("none")) {
        brightspots++;
      }
    });

    const severityData = Object.entries(severityCnt).map(([name, value]) => ({ name, value }));
    const landuseData = Object.entries(landuseCnt).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const districtData = Object.entries(districtCnt).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return {
      total,
      hotspots,
      brightspots,
      activeDistricts: Object.keys(districtCnt).length,
      uniqueLandcovers: Object.keys(landuseCnt).length,
      severityData,
      landuseData,
      districtData
    };
  }, [filteredFeatures, data]);

  const SEVERITY_COLORS: Record<string, string> = {
    "None": "#10b981",
    "Slight": "#14b8a6",
    "Moderate": "#f59e0b",
    "Medium": "#f59e0b",
    "Severe": "#f97316",
    "High": "#f97316",
    "Critical": "#ef4444",
    "Low": "#06b6d4"
  };
  const getSeverityColor = (sev: string) => {
    const norm = String(sev).trim();
    return SEVERITY_COLORS[norm] || "#64748b";
  };

  const getUnccdStatus = (props: any) => {
    const severity = String(props.sev || "").toLowerCase();
    if (severity.includes("high") || severity.includes("severe") || severity.includes("critical")) {
      return { label: "Hotspot", icon: "⚠️", className: "danger-status" };
    }
    if (severity.includes("low") || severity.includes("minimal") || severity.includes("stable") || severity.includes("none")) {
      return { label: "Bright Spot", icon: "🌟", className: "active-status" };
    }
    return null;
  };

  const handleExport = () => {
    const format = (document.getElementById("ldn-export-format") as HTMLSelectElement)?.value || "csv";
    const { records } = data || { records: [] };
    
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

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ borderTopColor: "var(--accent-blue)" }} />
        <div style={{ color: "#64748b", fontSize: 13 }}>Loading LDN Framework…</div>
      </div>
    );

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
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", overflow: "hidden" }}>
      {/* Top Header Bar with Switcher */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        background: "#ffffff",
        borderBottom: "1px solid var(--border-color)",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>🌳</span>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-title)" }}>
              Land Degradation Neutrality (LDN) Framework
            </h1>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
              Monitoring SDG 15.3.1 - Land Degradation & Telemetry
            </p>
          </div>
        </div>

        {/* View Mode Switcher Pill */}
        <div style={{
          display: "inline-flex",
          background: "#f1f5f9",
          padding: "3px",
          borderRadius: "9999px",
          border: "1px solid #e2e8f0"
        }}>
          <button
            onClick={() => setViewMode("spatial")}
            style={{
              padding: "5px 14px",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: "9999px",
              transition: "all 0.2s ease",
              background: viewMode === "spatial" ? "#ffffff" : "transparent",
              color: viewMode === "spatial" ? "#0f172a" : "#64748b",
              border: "none",
              boxShadow: viewMode === "spatial" ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
              cursor: "pointer"
            }}
          >
            Spatial Map View
          </button>
          <button
            onClick={() => setViewMode("dashboard")}
            style={{
              padding: "5px 14px",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: "9999px",
              transition: "all 0.2s ease",
              background: viewMode === "dashboard" ? "#ffffff" : "transparent",
              color: viewMode === "dashboard" ? "#0f172a" : "#64748b",
              border: "none",
              boxShadow: viewMode === "dashboard" ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
              cursor: "pointer"
            }}
          >
            Project Dashboard
          </button>
        </div>
      </div>

      {/* Main Content Zone */}
      {viewMode === "spatial" ? (
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
          <div className="quick-filters" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
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
              value={unccdFilter}
              onChange={(e) => {
                setUnccdFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All UNCCD Status</option>
              <option value="hotspot">Hotspots ⚠️</option>
              <option value="brightspot">Bright Spots 🌟</option>
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
              const status = getUnccdStatus(props);

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
                    <div style={{ display: "flex", gap: 4 }}>
                      {status && (
                        <span className={`site-badge ${status.className}`} style={{ fontSize: 8 }}>
                          {status.icon} {status.label}
                        </span>
                      )}
                      <span className={`site-badge ${getBadgeClass(severity)}`}>
                        {severity}
                      </span>
                    </div>
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

                  {/* UNCCD Strategic Objectives Alignment Card */}
                  {(() => {
                    const isHotspot = String(severity).toLowerCase().includes("high") || String(severity).toLowerCase().includes("severe");
                    return (
                      <div className="detail-explanation-card" style={{ borderLeftColor: isHotspot ? "var(--accent-rose)" : "var(--accent-green)", background: "rgba(255,255,255,0.4)" }}>
                        <div className="detail-explanation-title" style={{ color: isHotspot ? "var(--accent-rose)" : "var(--accent-green)" }}>
                          <span>🌍</span> UNCCD Strategic Objective Alignment
                        </div>
                        <div style={{ color: "var(--text-primary)", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>
                          {isHotspot ? "⚠️ SO-1: Combat Land Degradation (Critical Target)" : "🌟 SO-1: Avoid & Reduce Land Degradation"}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: 10, lineHeight: 1.4 }}>
                          {isHotspot ? (
                            <span>This node is flagged as a <strong>degraded hotspot</strong> under SDG 15.3.1. Immediate intervention is required to avoid further decline and restore land cover via mechanical reclamation, reforestation, or soil conservation.</span>
                          ) : (
                            <span>This node is classified as a <strong>bright spot</strong> or stable zone. Target for baseline protection. Ensure conservation farming practices are maintained to support ongoing recovery.</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
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
      </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "24px" }}>
          {/* KPI Dashboard Cards Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "16px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Total Surveys</span>
                <span style={{ fontSize: "20px" }}>🌲</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{dashboardStats?.total}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Active filtered telemetry records</div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "16px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Active Districts</span>
                <span style={{ fontSize: "20px" }}>🗺️</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{dashboardStats?.activeDistricts}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Districts reporting data</div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "16px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Land Cover Classes</span>
                <span style={{ fontSize: "20px" }}>🌿</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{dashboardStats?.uniqueLandcovers}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Unique land cover categories</div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "16px", boxShadow: "var(--shadow-sm)", borderLeft: "4px solid var(--accent-rose)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--accent-rose)" }}>Degraded Hotspots</span>
                <span style={{ fontSize: "20px" }}>⚠️</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--accent-rose)" }}>{dashboardStats?.hotspots}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Nodes classified as degraded</div>
            </div>
          </div>

          {/* Recharts Graphs Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "20px"
          }}>
            {/* Chart 1: Severity Distribution */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Degradation Severity Distribution
              </h3>
              {dashboardStats?.severityData && dashboardStats.severityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dashboardStats.severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {dashboardStats.severityData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={getSeverityColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Sites`, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px" }}>No data to display</div>
              )}
            </div>

            {/* Chart 2: Landuse cover */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Land Cover (LULC) Classification
              </h3>
              {dashboardStats?.landuseData && dashboardStats.landuseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dashboardStats.landuseData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-10} textAnchor="end" />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(value) => [`${value} Sites`, "Count"]} />
                    <Bar dataKey="value" name="Sites" radius={[4, 4, 0, 0]}>
                      {dashboardStats.landuseData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={["#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6"][index % 7]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px" }}>No data to display</div>
              )}
            </div>

            {/* Chart 3: District Monitoring */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Monitoring Activity by District
              </h3>
              {dashboardStats?.districtData && dashboardStats.districtData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dashboardStats.districtData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(value) => [`${value} Records`, "Count"]} />
                    <Bar dataKey="value" name="Records" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px" }}>No data to display</div>
              )}
            </div>
          </div>
        </div>
      )}
      {mounted && typeof document !== "undefined" && document.getElementById("sidebar-export-container") ? (
        createPortal(exportPanel, document.getElementById("sidebar-export-container")!)
      ) : null}
    </div>
  );
}
