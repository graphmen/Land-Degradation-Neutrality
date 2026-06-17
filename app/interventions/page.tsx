"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { downloadFile } from "@/lib/export";

const InterventionsMapView = dynamic(() => import("@/components/InterventionsMapView"), { ssr: false });

const CATEGORIES = [
  "Wetland Protection",
  "Erosion Control",
  "Forest Reforestation",
  "Gully Reclamation",
  "Sustainable Land Management",
  "Conservation Cropland"
];

const ADMIN_LEVELS = ["National", "Province", "District", "Ward"];
const STATUSES = ["Planned", "Ongoing", "Completed", "Suspended"];

// Helper to convert interventions to CSV
function convertInterventionsToCSV(records: any[]) {
  if (records.length === 0) return "";
  const headers = [
    "ID", "Name", "Category", "Organisation", "Admin Level", "Admin Area",
    "Size", "Status", "Budget & Funding", "Timeline", "Latitude", "Longitude",
    "Area Protected (ha)", "Sustainable Practices (ha)", "Carbon Sequestration (t CO2e)", "Beneficiaries",
    "Evidence", "Submission Time"
  ];

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return "";
    let str = String(val).replace(/"/g, '""');
    if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  };

  const headerLine = headers.join(",");
  const rows = records.map(r => [
    r._id,
    r.name,
    r.category,
    r.org,
    r.admin_level,
    r.admin_area,
    r.size,
    r.status,
    r.budget,
    r.timeline,
    r.lat,
    r.lng,
    r.indicators?.area_protected || 0,
    r.indicators?.sustainable_practices || 0,
    r.indicators?.carbon_sequestration || 0,
    r.indicators?.beneficiaries || 0,
    r.evidence,
    r._submission_time
  ].map(escapeCell).join(","));

  return [headerLine, ...rows].join("\n");
}

// Helper to convert interventions to GeoJSON
function convertInterventionsToGeoJSON(records: any[]) {
  const features = records.map(r => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [parseFloat(r.lng) || 0, parseFloat(r.lat) || 0]
    },
    properties: { ...r }
  }));
  return { type: "FeatureCollection", features };
}

// Helper to convert interventions to KML
function convertInterventionsToKML(records: any[], title: string = "Zimbabwe Interventions Export") {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${title}</name>
    <Folder>
      <name>Interventions</name>`;

  for (const r of records) {
    const name = r.name || "Intervention";
    let desc = '<table border="1" style="border-collapse:collapse;padding:5px;">';
    desc += `<tr><td><b>Category</b></td><td>${r.category}</td></tr>`;
    desc += `<tr><td><b>Organisation</b></td><td>${r.org}</td></tr>`;
    desc += `<tr><td><b>Admin Level</b></td><td>${r.admin_level} (${r.admin_area})</td></tr>`;
    desc += `<tr><td><b>Size</b></td><td>${r.size}</td></tr>`;
    desc += `<tr><td><b>Status</b></td><td>${r.status}</td></tr>`;
    desc += `<tr><td><b>Budget</b></td><td>${r.budget}</td></tr>`;
    desc += `<tr><td><b>Timeline</b></td><td>${r.timeline}</td></tr>`;
    desc += `<tr><td><b>Area Protected (ha)</b></td><td>${r.indicators?.area_protected || 0}</td></tr>`;
    desc += `<tr><td><b>Sustainable Practices (ha)</b></td><td>${r.indicators?.sustainable_practices || 0}</td></tr>`;
    desc += `<tr><td><b>Carbon Sequestration (t CO2e)</b></td><td>${r.indicators?.carbon_sequestration || 0}</td></tr>`;
    desc += `<tr><td><b>Beneficiaries</b></td><td>${r.indicators?.beneficiaries || 0}</td></tr>`;
    desc += `<tr><td><b>Evidence</b></td><td>${r.evidence}</td></tr>`;
    desc += '</table>';

    kml += `
      <Placemark>
        <name>${name}</name>
        <description><![CDATA[${desc}]]></description>
        <Point>
          <coordinates>${r.lng},${r.lat},0</coordinates>
        </Point>
      </Placemark>`;
  }

  kml += `
    </Folder>
  </Document>
</kml>`;
  return kml;
}

export default function InterventionsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminLevelFilter, setAdminLevelFilter] = useState("all");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Editor Form States: "view" | "add" | "edit"
  const [editorMode, setEditorMode] = useState<"view" | "add" | "edit">("view");
  const [formError, setFormError] = useState("");
  
  // Form input states
  const [formValues, setFormValues] = useState({
    name: "",
    category: CATEGORIES[0],
    org: "",
    admin_level: ADMIN_LEVELS[2], // Default to District
    admin_area: "",
    size: "",
    status: STATUSES[1], // Default to Ongoing
    budget: "",
    timeline: "",
    lat: -19.0,
    lng: 30.0,
    area_protected: 0,
    sustainable_practices: 0,
    carbon_sequestration: 0,
    beneficiaries: 0,
    evidence: ""
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/interventions", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setRecords(json.records || []);
        if (json.records?.length > 0) {
          setActiveId(json.records[0]._id);
        }
      }
    } catch (e) {
      console.error("Failed to load interventions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ borderTopColor: "var(--accent-green)" }} />
        <div style={{ color: "#64748b", fontSize: 13 }}>Loading Interventions Framework…</div>
      </div>
    );
  }

  // Filter logic
  const filteredRecords = records.filter((r) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      String(r.name || "").toLowerCase().includes(searchLower) ||
      String(r.org || "").toLowerCase().includes(searchLower) ||
      String(r.admin_area || "").toLowerCase().includes(searchLower);

    const matchCategory = categoryFilter === "all" || r.category === categoryFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchAdminLevel = adminLevelFilter === "all" || r.admin_level === adminLevelFilter;

    return matchSearch && matchCategory && matchStatus && matchAdminLevel;
  });

  // Pagination (10 per page)
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const currentRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeRecord = records.find(r => r._id === activeId);

  // Form submission handler (POST or PUT)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formValues.name || !formValues.org || !formValues.admin_area || !formValues.size || !formValues.budget || !formValues.timeline) {
      setFormError("All text fields are required.");
      return;
    }

    if (isNaN(formValues.lat) || isNaN(formValues.lng)) {
      setFormError("Coordinates must be valid numbers.");
      return;
    }

    const payload = {
      _id: editorMode === "edit" ? activeId : undefined,
      name: formValues.name,
      category: formValues.category,
      org: formValues.org,
      admin_level: formValues.admin_level,
      admin_area: formValues.admin_area,
      size: formValues.size,
      status: formValues.status,
      budget: formValues.budget,
      timeline: formValues.timeline,
      lat: Number(formValues.lat),
      lng: Number(formValues.lng),
      indicators: {
        area_protected: Number(formValues.area_protected) || 0,
        sustainable_practices: Number(formValues.sustainable_practices) || 0,
        carbon_sequestration: Number(formValues.carbon_sequestration) || 0,
        beneficiaries: Number(formValues.beneficiaries) || 0
      },
      evidence: formValues.evidence
    };

    try {
      const method = editorMode === "edit" ? "PUT" : "POST";
      const res = await fetch("/api/interventions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        setEditorMode("view");
        
        // Reload data
        const refreshRes = await fetch("/api/interventions", { cache: "no-store" });
        if (refreshRes.ok) {
          const rJson = await refreshRes.json();
          setRecords(rJson.records || []);
          if (editorMode === "add" && json.record) {
            setActiveId(json.record._id);
          }
        }
      } else {
        const data = await res.json();
        setFormError(data.error || "Save operation failed.");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    }
  };

  const handleEditClick = () => {
    if (!activeRecord) return;
    setFormValues({
      name: activeRecord.name || "",
      category: activeRecord.category || CATEGORIES[0],
      org: activeRecord.org || "",
      admin_level: activeRecord.admin_level || ADMIN_LEVELS[2],
      admin_area: activeRecord.admin_area || "",
      size: activeRecord.size || "",
      status: activeRecord.status || STATUSES[1],
      budget: activeRecord.budget || "",
      timeline: activeRecord.timeline || "",
      lat: activeRecord.lat || -19.0,
      lng: activeRecord.lng || 30.0,
      area_protected: activeRecord.indicators?.area_protected || 0,
      sustainable_practices: activeRecord.indicators?.sustainable_practices || 0,
      carbon_sequestration: activeRecord.indicators?.carbon_sequestration || 0,
      beneficiaries: activeRecord.indicators?.beneficiaries || 0,
      evidence: activeRecord.evidence || ""
    });
    setEditorMode("edit");
    setFormError("");
  };

  const handleAddClick = () => {
    setFormValues({
      name: "",
      category: CATEGORIES[0],
      org: "",
      admin_level: ADMIN_LEVELS[2],
      admin_area: "",
      size: "",
      status: STATUSES[1],
      budget: "",
      timeline: "",
      lat: -19.015,
      lng: 29.154,
      area_protected: 0,
      sustainable_practices: 0,
      carbon_sequestration: 0,
      beneficiaries: 0,
      evidence: ""
    });
    setEditorMode("add");
    setFormError("");
  };

  const handleDeleteClick = async () => {
    if (!activeId) return;
    if (!confirm("Are you sure you want to archive/delete this intervention?")) return;

    try {
      const res = await fetch(`/api/interventions?id=${activeId}`, { method: "DELETE" });
      if (res.ok) {
        const refreshRes = await fetch("/api/interventions", { cache: "no-store" });
        if (refreshRes.ok) {
          const rJson = await refreshRes.json();
          setRecords(rJson.records || []);
          if (rJson.records?.length > 0) {
            setActiveId(rJson.records[0]._id);
          } else {
            setActiveId(null);
          }
        }
      } else {
        alert("Delete failed.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    const format = (document.getElementById("interventions-export-format") as HTMLSelectElement)?.value || "csv";
    
    if (format === "geojson") {
      const geojsonObj = convertInterventionsToGeoJSON(filteredRecords);
      downloadFile(JSON.stringify(geojsonObj, null, 2), `interventions_export_${Date.now()}.geojson`, "application/json");
    } else if (format === "kml") {
      const kmlStr = convertInterventionsToKML(filteredRecords);
      downloadFile(kmlStr, `interventions_export_${Date.now()}.kml`, "application/vnd.google-earth.kml+xml");
    } else {
      const csvStr = convertInterventionsToCSV(filteredRecords);
      downloadFile(csvStr, `interventions_export_${Date.now()}.csv`, "text/csv;charset=utf-8;");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "active-status";
    if (s === "ongoing") return "warning-status";
    return "danger-status"; // planned or suspended
  };

  // Compute aggregated stats
  const totalInterventionsCount = filteredRecords.length;
  const totalBudget = filteredRecords.reduce((sum, r) => {
    const match = r.budget?.match(/\$?([\d,]+)/);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      return sum + (isNaN(val) ? 0 : val);
    }
    return sum;
  }, 0);

  const totalAreaProtected = filteredRecords.reduce((sum, r) => sum + (r.indicators?.area_protected || 0), 0);
  const totalBeneficiaries = filteredRecords.reduce((sum, r) => sum + (r.indicators?.beneficiaries || 0), 0);

  const exportPanel = (
    <div className="sidebar-export-panel">
      <div className="sidebar-export-panel-title">Export Dataset</div>
      <div className="sidebar-export-field">
        <label htmlFor="interventions-export-format" className="sidebar-export-label">Format</label>
        <select id="interventions-export-format" className="sidebar-export-select">
          <option value="csv">CSV</option>
          <option value="geojson">GeoJSON</option>
          <option value="kml">KML (Google Earth)</option>
        </select>
      </div>
      <button 
        className="sidebar-export-btn" 
        onClick={handleExport}
        style={{ background: "var(--accent-green)" }}
      >
        <span>📥</span> Download Data ({filteredRecords.length})
      </button>
    </div>
  );

  return (
    <div className="buims-container">
      {/* Panel 2: List Panel */}
      <div className={`buims-list-panel ${leftCollapsed ? "collapsed" : ""}`}>
        <div className="panel-header">
          <div className="panel-title" style={{ color: "var(--accent-green)", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>🛠️</span> Interventions Hub
            </span>
            <button 
              onClick={handleAddClick} 
              style={{
                background: "var(--accent-green)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              + Add New
            </button>
          </div>
          <div className="search-box">
            <input
              placeholder="Search name, organisation, area..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="quick-filters" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "10px" }}
            >
              <option value="all">Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "10px" }}
            >
              <option value="all">Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={adminLevelFilter}
              onChange={(e) => {
                setAdminLevelFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "10px" }}
            >
              <option value="all">Admin Levels</option>
              {ADMIN_LEVELS.map(al => <option key={al} value={al}>{al}</option>)}
            </select>
          </div>
        </div>

        <div className="list-scroll">
          {currentRecords.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 11, padding: 20 }}>
              No interventions found.
            </div>
          ) : (
            currentRecords.map((r) => {
              const isSelected = activeId === r._id;
              const statusBadge = getStatusBadgeClass(r.status);
              
              return (
                <div
                  key={r._id}
                  className={`site-card ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    setActiveId(r._id);
                    setEditorMode("view");
                  }}
                >
                  <div className="site-card-title">{r.name}</div>
                  <div className="site-card-subtitle">{r.org} • {r.admin_area}</div>
                  <div className="site-card-meta">
                    <span>🚜 {r.category}</span>
                    <span className={`site-badge ${statusBadge}`}>
                      {r.status || "Planned"}
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
        title={leftCollapsed ? "Expand list" : "Collapse list"}
      >
        {leftCollapsed ? "»" : "«"}
      </button>

      {/* Panel 3: Center Map Panel */}
      <div className="buims-map-panel">
        <InterventionsMapView records={filteredRecords} activeId={activeId} />
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
          <div className="detail-section-title">Aggregated Stats (Filtered)</div>
          <div className="snapshot-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Interventions</div>
              <div className="snapshot-val" style={{ color: "var(--accent-green)" }}>
                {totalInterventionsCount}
              </div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Budget Tracked</div>
              <div className="snapshot-val" style={{ color: "var(--accent-blue)" }}>
                ${totalBudget.toLocaleString()}
              </div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Protected Area</div>
              <div className="snapshot-val">{totalAreaProtected.toLocaleString()} ha</div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Beneficiaries</div>
              <div className="snapshot-val">{totalBeneficiaries.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Action Panel Content (Views Details, or Add form, or Edit form) */}
        <div className="detail-section" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          
          {editorMode === "view" && activeRecord && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div className="detail-site-name" style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-primary)" }}>
                  {activeRecord.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                  Organisation: <strong>{activeRecord.org}</strong>
                </div>
                
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <span className={`site-badge ${getStatusBadgeClass(activeRecord.status)}`}>
                    {activeRecord.status}
                  </span>
                  <span className="site-badge" style={{ background: "rgba(0,102,51,0.05)", color: "var(--text-green)", border: "1px solid rgba(0,102,51,0.12)" }}>
                    {activeRecord.category}
                  </span>
                </div>

                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, padding: "8px 10px", background: "rgba(0, 102, 51, 0.04)", borderRadius: 6, borderLeft: "3px solid var(--accent-green)", lineHeight: 1.4 }}>
                  <strong>National Target Alignment:</strong> This intervention specifically aims to restore lands to maintain voluntary national Land Degradation Neutrality targets.
                </div>
              </div>

              <div className="detail-item-list">
                <div className="detail-item-row">
                  <span className="detail-item-label">
                    <span className="detail-item-icon">🗺️</span> Admin Boundary
                  </span>
                  <span className="detail-item-value">{activeRecord.admin_level} level</span>
                </div>
                <div className="detail-item-row">
                  <span className="detail-item-label">
                    <span className="detail-item-icon">📍</span> Region/Area Name
                  </span>
                  <span className="detail-item-value">{activeRecord.admin_area}</span>
                </div>
                <div className="detail-item-row">
                  <span className="detail-item-label">
                    <span className="detail-item-icon">📏</span> Area Size Scale
                  </span>
                  <span className="detail-item-value">{activeRecord.size || "—"}</span>
                </div>
                <div className="detail-item-row">
                  <span className="detail-item-label">
                    <span className="detail-item-icon">💰</span> Budget & Funding
                  </span>
                  <span className="detail-item-value" style={{ fontWeight: 700, color: "var(--accent-green)" }}>
                    {activeRecord.budget || "—"}
                  </span>
                </div>
                <div className="detail-item-row">
                  <span className="detail-item-label">
                    <span className="detail-item-icon">📅</span> Program Timeline
                  </span>
                  <span className="detail-item-value">{activeRecord.timeline || "—"}</span>
                </div>
                <div className="detail-item-row">
                  <span className="detail-item-label">
                    <span className="detail-item-icon">🌐</span> Latitude
                  </span>
                  <span className="detail-item-value">{activeRecord.lat?.toFixed(5) || "—"}</span>
                </div>
                <div className="detail-item-row">
                  <span className="detail-item-label">
                    <span className="detail-item-icon">🌐</span> Longitude
                  </span>
                  <span className="detail-item-value">{activeRecord.lng?.toFixed(5) || "—"}</span>
                </div>
              </div>

              {/* Management Indicators Sub-section */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Key Management Indicators
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>Area Protected</div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {activeRecord.indicators?.area_protected || 0} ha
                    </div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>Sustainable Area</div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {activeRecord.indicators?.sustainable_practices || 0} ha
                    </div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>Carbon Sequestered</div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {activeRecord.indicators?.carbon_sequestration || 0} t CO2e
                    </div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>Beneficiaries</div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {activeRecord.indicators?.beneficiaries || 0} count
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Section */}
              <div className="detail-explanation-card" style={{ borderLeftColor: "var(--accent-green)", background: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                <div className="detail-explanation-title" style={{ color: "var(--accent-green)" }}>
                  <span>📋</span> Evidence on Achievement
                </div>
                <div style={{ color: "var(--text-primary)", fontSize: 10, lineHeight: 1.4 }}>
                  {activeRecord.evidence || "No evidence recorded yet."}
                </div>
              </div>

              {/* Editing & Deleting Actions */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button 
                  onClick={handleEditClick}
                  className="sidebar-export-btn"
                  style={{ flex: 1, padding: "8px", fontSize: "11px", background: "var(--accent-blue)" }}
                >
                  Edit details
                </button>
                <button 
                  onClick={handleDeleteClick}
                  className="action-btn-danger"
                  style={{ flex: 1, padding: "8px", fontSize: "11px", margin: 0 }}
                >
                  Archive Record
                </button>
              </div>
            </div>
          )}

          {editorMode === "view" && !activeRecord && (
            <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", padding: 20 }}>
              No intervention selected. Select one from the list or click "+ Add New" to register a project.
            </div>
          )}

          {/* Form Editor Panel (Create & Update) */}
          {(editorMode === "add" || editorMode === "edit") && (
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-green)", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                {editorMode === "add" ? "📝 Register New Intervention" : "✏️ Edit Intervention details"}
              </div>

              {formError && (
                <div style={{ padding: "6px 8px", background: "#fef2f2", color: "#b91c1c", fontSize: "10px", borderRadius: "var(--radius-sm)", border: "1px solid #fee2e2" }}>
                  ⚠️ {formError}
                </div>
              )}

              {/* Text Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Intervention Name</label>
                <input 
                  type="text" 
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  style={{ width: "100%", padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                  placeholder="e.g. Gutu Siltation Reclamation"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Category</label>
                  <select 
                    value={formValues.category}
                    onChange={(e) => setFormValues({ ...formValues, category: e.target.value })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Organisation</label>
                  <input 
                    type="text" 
                    value={formValues.org}
                    onChange={(e) => setFormValues({ ...formValues, org: e.target.value })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                    placeholder="e.g. EMA"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Admin Level</label>
                  <select 
                    value={formValues.admin_level}
                    onChange={(e) => setFormValues({ ...formValues, admin_level: e.target.value })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}
                  >
                    {ADMIN_LEVELS.map(al => <option key={al} value={al}>{al}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Admin Region/Area Name</label>
                  <input 
                    type="text" 
                    value={formValues.admin_area}
                    onChange={(e) => setFormValues({ ...formValues, admin_area: e.target.value })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                    placeholder="e.g. Gutu District"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Size scale (e.g. ha)</label>
                  <input 
                    type="text" 
                    value={formValues.size}
                    onChange={(e) => setFormValues({ ...formValues, size: e.target.value })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                    placeholder="e.g. 120 ha"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Status</label>
                  <select 
                    value={formValues.status}
                    onChange={(e) => setFormValues({ ...formValues, status: e.target.value })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Budget & Source</label>
                  <input 
                    type="text" 
                    value={formValues.budget}
                    onChange={(e) => setFormValues({ ...formValues, budget: e.target.value })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                    placeholder="e.g. $45,000 / GEF 7"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Timeline</label>
                  <input 
                    type="text" 
                    value={formValues.timeline}
                    onChange={(e) => setFormValues({ ...formValues, timeline: e.target.value })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                    placeholder="e.g. Jan 2026 - Dec 2026"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Latitude Coordinate</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    value={formValues.lat}
                    onChange={(e) => setFormValues({ ...formValues, lat: parseFloat(e.target.value) })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Longitude Coordinate</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    value={formValues.lng}
                    onChange={(e) => setFormValues({ ...formValues, lng: parseFloat(e.target.value) })}
                    style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                  />
                </div>
              </div>

              {/* Management indicators inputs */}
              <div style={{ background: "#f8fafc", padding: "6px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-green)" }}>
                  Management Indicators (Metrics)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <label style={{ fontSize: "8px", color: "var(--text-muted)" }}>Area Protected (ha)</label>
                    <input 
                      type="number" 
                      value={formValues.area_protected}
                      onChange={(e) => setFormValues({ ...formValues, area_protected: parseInt(e.target.value) || 0 })}
                      style={{ padding: "4px", fontSize: "10px", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <label style={{ fontSize: "8px", color: "var(--text-muted)" }}>Sustainable Area (ha)</label>
                    <input 
                      type="number" 
                      value={formValues.sustainable_practices}
                      onChange={(e) => setFormValues({ ...formValues, sustainable_practices: parseInt(e.target.value) || 0 })}
                      style={{ padding: "4px", fontSize: "10px", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <label style={{ fontSize: "8px", color: "var(--text-muted)" }}>Carbon Sequestered (t CO2e)</label>
                    <input 
                      type="number" 
                      value={formValues.carbon_sequestration}
                      onChange={(e) => setFormValues({ ...formValues, carbon_sequestration: parseInt(e.target.value) || 0 })}
                      style={{ padding: "4px", fontSize: "10px", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <label style={{ fontSize: "8px", color: "var(--text-muted)" }}>Beneficiaries (Count)</label>
                    <input 
                      type="number" 
                      value={formValues.beneficiaries}
                      onChange={(e) => setFormValues({ ...formValues, beneficiaries: parseInt(e.target.value) || 0 })}
                      style={{ padding: "4px", fontSize: "10px", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Evidence Textarea */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Evidence on Achievement</label>
                <textarea 
                  value={formValues.evidence}
                  onChange={(e) => setFormValues({ ...formValues, evidence: e.target.value })}
                  style={{ width: "100%", padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", height: "50px", resize: "none" }}
                  placeholder="Record achieved works, fence completion details, local coordination structures..."
                />
              </div>

              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <button 
                  type="submit" 
                  className="sidebar-export-btn"
                  style={{ flex: 1, padding: "8px", fontSize: "11px", background: "var(--accent-green)" }}
                >
                  Save Intervention
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditorMode("view")}
                  style={{ flex: 1, padding: "8px", fontSize: "11px", background: "#64748b", border: "none", color: "#fff", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: "700" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {mounted && typeof document !== "undefined" && document.getElementById("sidebar-export-container") ? (
        createPortal(exportPanel, document.getElementById("sidebar-export-container")!)
      ) : null}
    </div>
  );
}
