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
  let lat = r.lat ?? r.latitude;
  let lng = r.lng ?? r.lon ?? r.longitude;

  if (lat == null || lng == null) {
    const g = r._geolocation;
    if (Array.isArray(g) && g.length >= 2 && g[0] != null) {
      lat = g[0];
      lng = g[1];
    } else {
      const raw = (r.raw_data && typeof r.raw_data === "object") ? r.raw_data : {};
      const pt = raw["geninfo/GPS"] || raw["g1/gps"] || raw["sampl/poin"] || raw["GPS"] || raw["location"] || raw["geopoint"] || r.GPS || r.gps || r.location;
      if (typeof pt === "string") {
        const p = pt.trim().split(/\s+/);
        if (p.length >= 2) {
          lat = p[0];
          lng = p[1];
        }
      }
    }
  }

  if (lat == null || lng == null || isNaN(+lat) || isNaN(+lng)) return null;

  let nLat = +lat;
  let nLng = +lng;

  if (nLat > 0 && nLng < 0) {
    const tmp = nLat;
    nLat = nLng;
    nLng = tmp;
  }

  if (nLat >= -23.0 && nLat <= -15.0 && nLng >= 24.0 && nLng <= 34.0) {
    return [nLat, nLng];
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

function extractPhotoUrl(r: any): string | null {
  if (!r) return null;
  if (typeof r.photo_url === "string" && r.photo_url.startsWith("http")) return r.photo_url;
  if (typeof r.thumb_url === "string" && r.thumb_url.startsWith("http")) return r.thumb_url;

  const sup = r._supabase_photos || r.raw_data?._supabase_photos;
  if (Array.isArray(sup) && sup.length > 0) {
    const first = sup[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    if (first && typeof first.url === "string" && first.url.startsWith("http")) return first.url;
  }

  const atts = r._attachments || r.raw_data?._attachments;
  if (Array.isArray(atts) && atts.length > 0) {
    const img = atts.find((att: any) =>
      att && (att.download_medium_url || att.download_small_url || att.download_url)
    ) || atts[0];
    if (img) return img.download_medium_url || img.download_small_url || img.download_url || null;
  }

  return null;
}

function buildDashboardData(records: any[]) {
  const landuseCnt: Record<string, number> = {};
  const districtCnt: Record<string, number> = {};
  const severityCnt: Record<string, number> = {};
  const features: any[] = [];
  const landUses = new Set<string>();

  for (const r of records) {
    const landus = r.landus || r.land_use || r.land_cover || r["ldi/tree"] || r["ldi/land_cover"];
    const dist = r.dist || r.district || r["geninfo/dist"];
    const sev = r.sev || r.severity || r["ldi/sev"];

    if (landus) {
      landuseCnt[landus] = (landuseCnt[landus] || 0) + 1;
      landUses.add(landus);
    }
    if (dist) districtCnt[dist] = (districtCnt[dist] || 0) + 1;
    if (sev) severityCnt[sev] = (severityCnt[sev] || 0) + 1;

    const geo = extractGeo(r);
    if (geo) {
      const props: any = { _id: r._id || r.id || r.kobo_id };

      if (r.raw_data && typeof r.raw_data === "object") {
        for (const [k, v] of Object.entries(r.raw_data)) {
          if (v != null && v !== "" && !HIDDEN.has(k)) {
            props[k] = v;
            if (k.includes("/") && !k.startsWith("_")) {
              const short = k.split("/").pop()!;
              if (!(short in props)) props[short] = v;
            }
          }
        }
      }

      for (const [k, v] of Object.entries(r)) {
        if (v != null && v !== "" && !k.startsWith("_") && k !== "raw_data" && !HIDDEN.has(k)) {
          props[k] = v;
        }
      }

      props.dist = dist || props.dist;
      props.landus = landus || props.landus;
      props.sev = sev || props.sev;

      const photoUrl = extractPhotoUrl(r);
      if (photoUrl) {
        props.photo_url = photoUrl;
      }
      const atts = r._attachments || r.raw_data?._attachments;
      if (atts) props._attachments = atts;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [geo[1], geo[0]] },
        properties: props
      });
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

const SKIP_KEYS = new Set([
  "_id", "id", "kobo_id", "dist", "ward", "sev", "landus", "agent", "team",
  "ceid", "samplid", "photo_url", "thumb_url", "_submission_time",
  "raw_data", "_geolocation", "_validation_status", "_submitted_by",
  "lat", "lng", "latitude", "longitude"
]);

function AllFieldsAccordion({ props }: { props: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(props).filter(
    ([k, v]) => !SKIP_KEYS.has(k) && v != null && v !== "" && typeof v !== "object"
  );
  if (entries.length === 0) return null;
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", background: "rgba(0,0,0,0.03)", border: "none", cursor: "pointer",
          fontSize: 11, fontWeight: 700, color: "var(--text-primary)", letterSpacing: 0.3,
          textTransform: "uppercase"
        }}
      >
        <span>📋 All Survey Data ({entries.length} fields)</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {open && (
        <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px 0" }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{
              display: "flex", gap: 8, padding: "4px 12px", borderBottom: "1px solid rgba(0,0,0,0.04)",
              alignItems: "flex-start"
            }}>
              <span style={{ flex: "0 0 45%", fontSize: 10, color: "var(--text-muted)", fontWeight: 600, wordBreak: "break-word", paddingTop: 1 }}>
                {k}
              </span>
              <span style={{ flex: 1, fontSize: 10, color: "var(--text-primary)", wordBreak: "break-word" }}>
                {String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
        const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const urlId = params?.get("id");
        if (urlId) {
          setActiveId(String(urlId));
        } else if (parsed.geojson.features.length > 0) {
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

  const filteredGeojson = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredFeatures,
      total: filteredFeatures.length,
    }),
    [filteredFeatures]
  );

  const activeFeature = filteredFeatures.find((f: any) => String(f.properties._id) === String(activeId));

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
          <div className="quick-filters cols-3">
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
              const isSelected = String(activeId) === String(props._id);
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
        <MapView geojson={filteredGeojson} activeId={activeId} onSelect={(id) => setActiveId(String(id))} mode="ldn" />
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
          <div className="detail-section-title">Point Details</div>
          {activeFeature ? (
            (() => {
              const props = activeFeature.properties;
              const [lng, lat] = activeFeature.geometry.coordinates;
              const severity = props.sev || "Not Rated";
              const district = props.dist || "Unspecified District";
              const ward = props.ward || "Unspecified Ward";

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Header */}
                  <div>
                    <div className="detail-site-name">{district}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                      {ward ? (String(ward).startsWith("Ward") ? ward : `Ward ${ward}`) : "—"} · {props.landus || "Land Use Unknown"}
                    </div>
                    <span className={`site-badge ${getBadgeClass(severity)}`}>{severity} Severity</span>
                  </div>

                  {/* Field Photo — prominent, point-specific */}
                  {(props.photo_url || props.thumb_url) ? (
                    <div style={{ width: "100%", height: "160px", borderRadius: "10px", overflow: "hidden", background: "#0f172a", flexShrink: 0 }}>
                      <img
                        src={`/api/media?url=${encodeURIComponent(props.photo_url || props.thumb_url)}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        alt="Field Photo"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : null}

                  {/* Key attributes */}
                  <div className="detail-item-list">
                    <div className="detail-item-row">
                      <span className="detail-item-label"><span className="detail-item-icon">🏷️</span> Survey CEID / ID</span>
                      <span className="detail-item-value" style={{ fontWeight: 700, color: "#0284c7" }}>{props.ceid || props.samplid || props._id || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label"><span className="detail-item-icon">🗺️</span> District Jurisdiction</span>
                      <span className="detail-item-value">{props.dist || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label"><span className="detail-item-icon">📍</span> Electoral Ward</span>
                      <span className="detail-item-value">{props.ward ? (String(props.ward).startsWith("Ward") ? props.ward : `Ward ${props.ward}`) : "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label"><span className="detail-item-icon">⚠️</span> Degradation Severity</span>
                      <span className="detail-item-value" style={{ fontWeight: 700, color: String(severity).toLowerCase().includes("high") || String(severity).toLowerCase().includes("severe") ? "#e11d48" : "#10b981" }}>{severity || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label"><span className="detail-item-icon">🌿</span> Land Use / Cover (LULC)</span>
                      <span className="detail-item-value">{props.landus || "—"}</span>
                    </div>
                    {props.veg_cover && (
                      <div className="detail-item-row">
                        <span className="detail-item-label"><span className="detail-item-icon">🌱</span> Vegetation Cover (%)</span>
                        <span className="detail-item-value">{props.veg_cover}</span>
                      </div>
                    )}
                    {props.erosion_signs && (
                      <div className="detail-item-row">
                        <span className="detail-item-label"><span className="detail-item-icon">🏜️</span> Erosion Signs / Notes</span>
                        <span className="detail-item-value">{props.erosion_signs}</span>
                      </div>
                    )}
                    <div className="detail-item-row">
                      <span className="detail-item-label"><span className="detail-item-icon">👷</span> Survey Observer / Team</span>
                      <span className="detail-item-value">{props.agent || props.team || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label"><span className="detail-item-icon">🌐</span> Latitude</span>
                      <span className="detail-item-value">{lat.toFixed(6)}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label"><span className="detail-item-icon">🌐</span> Longitude</span>
                      <span className="detail-item-value">{lng.toFixed(6)}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label"><span className="detail-item-icon">📅</span> Survey Date</span>
                      <span className="detail-item-value">{props._submission_time ? new Date(props._submission_time).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>

                  {/* All Raw Survey Fields — collapsible */}
                  <AllFieldsAccordion props={props} />
                </div>
              );
            })()
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "32px 12px", textAlign: "center" }}>
              <span style={{ fontSize: 36, lineHeight: 1 }}>📍</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Click any map point</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>Select a monitoring node on the map to view its full survey attributes, field photo, and all field metadata here.</div>
            </div>
          )}
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

          {/* Top Row: Degradation Severity Distribution (Left) & Land Cover (LULC) Classification (Right) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "20px",
            marginBottom: "20px"
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
          </div>

          {/* Full-Width Bottom Section: Monitoring Activity by District */}
          <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "var(--shadow-sm)", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Monitoring Activity & Telemetry Records by District
                </h3>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                  Total field survey nodes collected and monitored across all reporting districts
                </p>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 12px", background: "rgba(59, 130, 246, 0.1)", color: "#1d4ed8", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                {dashboardStats?.districtData?.length || 0} Active Districts
              </span>
            </div>
            {dashboardStats?.districtData && dashboardStats.districtData.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={dashboardStats.districtData} margin={{ top: 15, right: 20, left: 0, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#475569" }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#475569" }}
                    label={{ value: "Survey Records", angle: -90, position: "insideLeft", fontSize: 10, fill: "#64748b" }}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }}
                    formatter={(value) => [`${value} Records`, "Survey Count"]}
                  />
                  <Bar dataKey="value" name="Records" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px" }}>No data to display</div>
            )}
          </div>
        </div>
      )}
      {mounted && typeof document !== "undefined" && document.getElementById("sidebar-export-container") ? (
        createPortal(exportPanel, document.getElementById("sidebar-export-container")!)
      ) : null}
    </div>
  );
}
