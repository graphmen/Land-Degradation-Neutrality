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

const SOIL_TEXTURE_GUIDE: Record<string, { icon: string; physical: string; retention: string; impact: string; erosion: string }> = {
  Clay: {
    icon: "🧱",
    physical: "Fine-grained, sticky when wet, hard when dry. Heavy texture.",
    retention: "Extremely high water and nutrient retention; slow infiltration.",
    impact: "Highly fertile but difficult to cultivate; susceptible to compaction.",
    erosion: "Low wind erosion risk; high water runoff and water erosion risk."
  },
  Loam: {
    icon: "🌟",
    physical: "Balanced mix of sand, silt, and clay. Crumbly, medium texture.",
    retention: "Optimal water-holding capacity and excellent nutrient storage.",
    impact: "Most fertile agricultural soil; easy to till with great aeration.",
    erosion: "Moderate erosion risk; easily manageable with standard conservation."
  },
  Sand: {
    icon: "🏜️",
    physical: "Coarse-grained, loose and gritty particles. Light texture.",
    retention: "Very low retention; rapid drainage and nutrient leaching.",
    impact: "Low natural fertility; requires frequent irrigation and organic matter.",
    erosion: "Extremely high wind erosion risk; low water runoff erosion."
  },
  Silt: {
    icon: "🌫️",
    physical: "Smooth, floury texture when dry, soapy/slippery when wet.",
    retention: "Good water retention and medium-to-high nutrient storage.",
    impact: "Highly fertile, but packs easily and lacks structure.",
    erosion: "Highly vulnerable to both water and wind erosion; crusts easily."
  }
};

function extractSoilSamples(rawRecords: any[]) {
  const samples: any[] = [];
  for (const r of rawRecords) {
    if (r.sampl && Array.isArray(r.sampl)) {
      for (const [i, s] of r.sampl.entries()) {
        const flatSample = { ...r, ...s, _id: `${r._id}_${i}` };
        delete flatSample.sampl;
        samples.push(flatSample);
      }
    } else {
      samples.push(r);
    }
  }
  return samples;
}

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

  const latField = Object.keys(r).find((k) => k.toLowerCase() === "lat" || k.toLowerCase() === "latitude");
  const lngField = Object.keys(r).find(
    (k) => k.toLowerCase() === "lng" || k.toLowerCase() === "longitude" || k.toLowerCase() === "lon"
  );

  if (latField && lngField && !isNaN(+r[latField]) && !isNaN(+r[lngField])) {
    return [+r[latField], +r[lngField]];
  }

  for (const k of Object.keys(r)) {
    const klower = k.toLowerCase();
    if (
      klower.includes("gps") ||
      klower.includes("location") ||
      klower.includes("point") ||
      klower.includes("poin") ||
      klower.includes("coord") ||
      klower.includes("geopoint")
    ) {
      const v = r[k];
      if (typeof v === "string") {
        const p = v.trim().split(/\s+/);
        if (p.length >= 2 && !isNaN(+p[0]) && !isNaN(+p[1])) return [+p[0], +p[1]];
      }
    }
  }
  return null;
}

async function fetchAllRecords(): Promise<any> {
  try {
    const res = await fetch("/api/soil?limit=5000", { cache: "no-store" });
    if (!res.ok) {
      const errTxt = await res.text();
      return { error: `Server error: ${res.status} ${errTxt}`, records: [] };
    }
    const json = await res.json();
    if (json.error) {
      return { error: json.error, records: [] };
    }
    const samples = extractSoilSamples((json.records ?? []).map(normalise));
    return { records: samples, error: null };
  } catch (e: any) {
    return { error: e.message, records: [] };
  }
}

function buildDashboardData(records: any[], error: string | null = null) {
  const textureCnt: Record<string, number> = {};
  const districtCnt: Record<string, number> = {};
  let totalDepth = 0;
  let depthCount = 0;
  const features: any[] = [];

  const textures = new Set<string>();
  const districts = new Set<string>();

  for (const r of records) {
    const tex = r.tex || r["sampl/tex"] || r.texture || r.Soil_Texture || r.soil_texture || r.Texture;
    const dist = r.dist || r["geninfo/dist"] || r.district || r.District;
    const dep = r.dep || r["sampl/dep"] || r.depth || r.Depth;
    const loc = r.samloc || r["sampl/samloc"] || r.location_name || r.site_name;
    const moist = r.moisture || r["sampl/moisture"] || r.Moisture;
    const col = r.col || r["sampl/col"] || r.color || r.Color || r.soil_color;

    if (tex) {
      textureCnt[tex] = (textureCnt[tex] || 0) + 1;
      textures.add(tex);
    }
    if (dist) {
      districtCnt[dist] = (districtCnt[dist] || 0) + 1;
      districts.add(dist);
    }
    if (dep && !isNaN(+dep)) {
      totalDepth += +dep;
      depthCount++;
    }

    const geo = extractGeo(r);
    if (geo) {
      const props: any = {
        _id: r._id,
        _mapped_tex: tex,
        _mapped_dist: dist,
        _mapped_dep: dep,
        _mapped_loc: loc,
        _mapped_moist: moist,
        _mapped_col: col,
      };
      for (const [k, v] of Object.entries(r))
        if (!k.startsWith("_") && !k.includes("/") && !HIDDEN.has(k)) props[k] = v;
      features.push({ type: "Feature", geometry: { type: "Point", coordinates: [geo[1], geo[0]] }, properties: props });
    }
  }

  return {
    records,
    error,
    geojson: { type: "FeatureCollection", features, total: features.length },
    kpis: {
      total_samples: records.length,
      mapped_points: features.length,
      textures: Object.keys(textureCnt).length,
      avg_depth: depthCount > 0 ? +(totalDepth / depthCount).toFixed(1) : 0,
    },
    charts: {
      by_texture: Object.entries(textureCnt).map(([name, value]) => ({ name, value })),
    },
    textures: Array.from(textures).sort(),
    districts: Array.from(districts).sort(),
  };
}

export default function SoilPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [textureFilter, setTextureFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
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
      .then((res) => {
        const parsed = buildDashboardData(res.records, res.error);
        setData(parsed);
        if (parsed.geojson.features.length > 0) {
          setActiveId(parsed.geojson.features[0].properties._id);
        }
      })
      .catch((e) => {
        console.error(e);
        setData(buildDashboardData([], e.message));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ borderTopColor: "var(--accent-amber)" }} />
        <div style={{ color: "#64748b", fontSize: 13 }}>Loading Soil Core Hub…</div>
      </div>
    );

  const { kpis, geojson, charts, error, records, textures, districts } = data;

  if (error)
    return (
      <div
        className="eartheye-container"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1120" }}
      >
        <div
          style={{
            background: "rgba(244,63,94,0.1)",
            border: "1px solid var(--accent-rose)",
            padding: 30,
            borderRadius: 12,
            maxWidth: 600,
            color: "var(--accent-rose)",
          }}
        >
          <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚠️</span> API Connection Error
          </h2>
          <p style={{ lineHeight: 1.5 }}>{error}</p>
          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 20 }}>
            Please check the network tab or API configuration.
          </p>
        </div>
      </div>
    );

  const filteredFeatures = geojson.features.filter((f: any) => {
    const props = f.properties;
    const district = String(props._mapped_dist || "").toLowerCase();
    const ward = String(props.ward || "").toLowerCase();
    const ceid = String(props.ceid || "").toLowerCase();
    const texture = String(props._mapped_tex || "").toLowerCase();
    const loc = String(props._mapped_loc || props.samloc || "").toLowerCase();
    const searchLower = search.toLowerCase();

    const matchSearch = 
      district.includes(searchLower) || 
      ward.includes(searchLower) || 
      ceid.includes(searchLower) || 
      texture.includes(searchLower) || 
      loc.includes(searchLower);

    const matchTexture = textureFilter === "all" || props._mapped_tex === textureFilter;
    const matchDistrict = districtFilter === "all" || props._mapped_dist === districtFilter;

    return matchSearch && matchTexture && matchDistrict;
  });

  const handleExport = () => {
    const format = (document.getElementById("soil-export-format") as HTMLSelectElement)?.value || "csv";
    
    if (format === "geojson") {
      const geojsonObj = {
        type: "FeatureCollection",
        features: filteredFeatures
      };
      const geojsonStr = JSON.stringify(geojsonObj, null, 2);
      downloadFile(geojsonStr, `soil_data_export_${Date.now()}.geojson`, "application/json");
    } else if (format === "kml") {
      const kmlStr = convertToKML(filteredFeatures, "Zimbabwe Soil Data Export");
      downloadFile(kmlStr, `soil_data_export_${Date.now()}.kml`, "application/vnd.google-earth.kml+xml");
    } else {
      const filteredIdSet = new Set(filteredFeatures.map((f: any) => f.properties._id));
      const filteredOriginalRecords = records.filter((r: any) => filteredIdSet.has(r._id));
      const csvStr = convertToCSV(filteredOriginalRecords);
      downloadFile(csvStr, `soil_data_export_${Date.now()}.csv`, "text/csv;charset=utf-8;");
    }
  };

  // Pagination (10 per page)
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredFeatures.length / itemsPerPage));
  const currentFeatures = filteredFeatures.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeFeature = geojson.features.find((f: any) => f.properties._id === activeId);

  // Texture badge color mapper
  const getBadgeClass = (texture: string) => {
    const t = (texture || "").toLowerCase();
    if (t.includes("clay")) return "danger-status";
    if (t.includes("loam") || t.includes("silt")) return "warning-status";
    return "active-status"; // sand or default
  };

  const exportPanel = (
    <div className="sidebar-export-panel">
      <div className="sidebar-export-panel-title">Export Dataset</div>
      <div className="sidebar-export-field">
        <label htmlFor="soil-export-format" className="sidebar-export-label">Format</label>
        <select id="soil-export-format" className="sidebar-export-select">
          <option value="csv">CSV</option>
          <option value="geojson">GeoJSON</option>
          <option value="kml">KML (Google Earth)</option>
        </select>
      </div>
      <button 
        className="sidebar-export-btn" 
        onClick={handleExport}
        style={{ background: "var(--accent-amber)" }}
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
          <div className="panel-title" style={{ color: "var(--accent-amber)" }}>
            <span>🧪</span> Soil Cores
          </div>
          <div className="search-box">
            <input
              placeholder="Search location, texture..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="quick-filters">
            <select
              value={textureFilter}
              onChange={(e) => {
                setTextureFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Textures</option>
              {textures.map((t: string) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Districts</option>
              {districts.map((d: string) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="list-scroll">
          {/* Soil Texture Reference Dictionary */}
          <div className="soil-texture-dictionary">
            <details className="dictionary-main">
              <summary className="dictionary-main-summary">
                <span>📖 Soil Texture Reference Guide</span>
              </summary>
              <div className="dictionary-grid">
                {Object.entries(SOIL_TEXTURE_GUIDE).map(([name, info]) => (
                  <details key={name} className="dictionary-item">
                    <summary className="dictionary-item-summary">
                      <span>{info.icon} {name}</span>
                    </summary>
                    <div className="dictionary-item-details">
                      <p><strong>Physical:</strong> {info.physical}</p>
                      <p><strong>Water Retention:</strong> {info.retention}</p>
                      <p><strong>Agricultural Impact:</strong> {info.impact}</p>
                      <p><strong>Erosion Risks:</strong> {info.erosion}</p>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          </div>
          {currentFeatures.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 11, padding: 20 }}>
              No soil core samples.
            </div>
          ) : (
            currentFeatures.map((f: any) => {
              const props = f.properties;
              const district = props._mapped_dist || "Unspecified District";
              const ward = props.ward || "Unspecified Ward";
              const ceid = props.ceid || "—";
              const texture = props._mapped_tex || "Unknown";
              
              const formatLoc = (loc: string) => {
                if (!loc) return "Unknown Sample";
                const mapped: Record<string, string> = {
                  cent: "Center Sample",
                  north: "North Sample",
                  east: "East Sample",
                  south: "South Sample",
                  west: "West Sample",
                };
                return mapped[loc.toLowerCase()] || `${loc} Sample`;
              };
              
              const sampleName = formatLoc(props._mapped_loc || props.samloc);
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
                    <span>🧪 {sampleName}</span>
                    <span className={`site-badge ${getBadgeClass(texture)}`}>
                      {texture}
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
              <div className="snapshot-lbl">Samples</div>
              <div className="snapshot-val" style={{ color: "var(--accent-amber)" }}>
                {kpis.total_samples}
              </div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Mapped</div>
              <div className="snapshot-val">{kpis.mapped_points}</div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Avg Depth</div>
              <div className="snapshot-val">{kpis.avg_depth}cm</div>
            </div>
          </div>
        </div>

        {/* Selected Site Details Section */}
        <div className="detail-section" style={{ flex: 1, overflowY: "auto" }}>
          <div className="detail-section-title">Core Command</div>
          {activeFeature ? (
            (() => {
              const props = activeFeature.properties;
              const [lng, lat] = activeFeature.geometry.coordinates;
              const name = props._mapped_loc || props.samloc || "Soil Sample";

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div className="detail-site-name">{name}</div>
                    <span className={`site-badge ${getBadgeClass(props._mapped_tex)}`}>
                      {props._mapped_tex || "Unknown"}
                    </span>
                  </div>

                  <div className="detail-item-list">
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">🗺️</span> District Jurisdiction
                      </span>
                      <span className="detail-item-value">{props._mapped_dist || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">📐</span> Soil Core Depth
                      </span>
                      <span className="detail-item-value" style={{ color: "var(--accent-amber)", fontWeight: 700 }}>
                        {props._mapped_dep ? `${props._mapped_dep} cm` : "—"}
                      </span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">🎨</span> Munsell Soil Color
                      </span>
                      <span className="detail-item-value">{props._mapped_col || "—"}</span>
                    </div>
                    <div className="detail-item-row">
                      <span className="detail-item-label">
                        <span className="detail-item-icon">💧</span> Moisture Status
                      </span>
                      <span className="detail-item-value">{props._mapped_moist || "—"}</span>
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
                        <span className="detail-item-icon">📅</span> Submission Date
                      </span>
                      <span className="detail-item-value">
                        {props._submission_time ? new Date(props._submission_time).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Soil Texture Guidelines Card */}
                  <div className="detail-explanation-card">
                    <div className="detail-explanation-title">
                      <span>📖</span> Texture Suitability Reference
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, lineHeight: 1.4 }}>
                      {(() => {
                        const tex = (props._mapped_tex || "").toLowerCase();
                        let matchedKey = "";
                        if (tex.includes("clay")) matchedKey = "Clay";
                        else if (tex.includes("loam")) matchedKey = "Loam";
                        else if (tex.includes("sand")) matchedKey = "Sand";
                        else if (tex.includes("silt")) matchedKey = "Silt";

                        if (matchedKey) {
                          const info = SOIL_TEXTURE_GUIDE[matchedKey];
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{info.icon} {matchedKey} Properties:</div>
                              <div>• <strong>Physical:</strong> {info.physical}</div>
                              <div>• <strong>Water Retention:</strong> {info.retention}</div>
                              <div>• <strong>Agricultural Impact:</strong> {info.impact}</div>
                              <div>• <strong>Erosion Risks:</strong> {info.erosion}</div>
                            </div>
                          );
                        }
                        return "🧪 Unknown/Mixed: Dynamic soil matrix. Refer to local sample parameters for land management decisions.";
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: 11 }}>No soil core selected</div>
          )}
        </div>

        {/* Soil Texture breakdown */}
        {geojson.total > 0 && charts.by_texture.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">Soil Texture Profile</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {charts.by_texture.map((item: any, idx: number) => {
                const total = geojson.total;
                const percent = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                      <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>
                        {item.value} ({percent.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.03)", borderRadius: 2, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${percent}%`,
                          background: "linear-gradient(90deg, #d97706, #fbbf24)",
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
            Archive Soil Core Record
          </button>
        </div>
      </div>
      {mounted && typeof document !== "undefined" && document.getElementById("sidebar-export-container") ? (
        createPortal(exportPanel, document.getElementById("sidebar-export-container")!)
      ) : null}
    </div>
  );
}
