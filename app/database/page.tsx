"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  Download, 
  Database, 
  RefreshCw, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  Info,
  Layers,
  MapPin,
  Calendar,
  User,
  Activity
} from "lucide-react";
import { downloadFile, convertToCSV } from "@/lib/export";

// Helper to strip prefixes
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

// Helpers for data conversion
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

export default function DatabaseExplorer() {
  const [activeTab, setActiveTab] = useState<"ldn" | "soil">("ldn");
  
  // Data states
  const [ldnRecords, setLdnRecords] = useState<any[]>([]);
  const [soilRecords, setSoilRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all"); // LULC for LDN, Texture for Soil
  const [severityOrMoistureFilter, setSeverityOrMoistureFilter] = useState("all"); // Severity for LDN, Moisture for Soil
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Sorting states
  const [sortField, setSortField] = useState<string>("_submission_time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Inspection Modal state
  const [inspectRecord, setInspectRecord] = useState<any | null>(null);

  // Fetch datasets
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ldnRes, soilRes] = await Promise.all([
        fetch("/api/ldn?limit=5000", { cache: "no-store" }).then(r => r.json()).catch(() => ({ records: [] })),
        fetch("/api/soil?limit=5000", { cache: "no-store" }).then(r => r.json()).catch(() => ({ records: [] }))
      ]);

      const normalisedLdn = (ldnRes.records ?? []).map(normalise);
      const normalisedSoil = extractSoilSamples((soilRes.records ?? []).map(normalise));
      
      setLdnRecords(normalisedLdn);
      setSoilRecords(normalisedSoil);
    } catch (e: any) {
      setError(e.message || "Failed to load telemetry datasets from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset filters when tab changes
  useEffect(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setDistrictFilter("all");
    setCategoryFilter("all");
    setSeverityOrMoistureFilter("all");
    setCurrentPage(1);
    
    if (activeTab === "ldn") {
      setSortField("_submission_time");
      setSortDirection("desc");
    } else {
      setSortField("_submission_time");
      setSortDirection("desc");
    }
  }, [activeTab]);

  // Dynamic filter dropdown options
  const filterOptions = useMemo(() => {
    const records = activeTab === "ldn" ? ldnRecords : soilRecords;
    const districts = new Set<string>();
    const categories = new Set<string>(); // LULC (landus) or Texture (tex)
    const extraOptions = new Set<string>(); // Severity (sev) or Moisture (moisture)

    records.forEach(r => {
      // Districts
      const dist = r.dist || r["geninfo/dist"] || r.district || r.District || r._mapped_dist;
      if (dist) districts.add(dist);

      if (activeTab === "ldn") {
        if (r.landus) categories.add(r.landus);
        if (r.sev) extraOptions.add(r.sev);
      } else {
        const tex = r.tex || r["sampl/tex"] || r.texture || r._mapped_tex;
        if (tex) categories.add(tex);
        const moist = r.moisture || r["sampl/moisture"] || r._mapped_moist;
        if (moist) extraOptions.add(moist);
      }
    });

    return {
      districts: Array.from(districts).sort(),
      categories: Array.from(categories).sort(),
      extraOptions: Array.from(extraOptions).sort()
    };
  }, [activeTab, ldnRecords, soilRecords]);

  // Filter & Sort logic
  const processedRecords = useMemo(() => {
    const rawList = activeTab === "ldn" ? ldnRecords : soilRecords;
    
    // 1. Filtering
    const filtered = rawList.filter(r => {
      // Search Query
      const dist = String(r.dist || r["geninfo/dist"] || r.district || r.District || r._mapped_dist || "").toLowerCase();
      const ward = String(r.ward || "").toLowerCase();
      const ceid = String(r.ceid || r.samplid || r["sampl/samplid"] || "").toLowerCase();
      const agent = String(r.agent || "").toLowerCase();
      const localname = String(r.localname || r.samloc || r["sampl/samloc"] || "").toLowerCase();
      
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = 
        dist.includes(searchStr) || 
        ward.includes(searchStr) || 
        ceid.includes(searchStr) || 
        agent.includes(searchStr) ||
        localname.includes(searchStr);

      // District
      const matchDistrict = districtFilter === "all" || 
        (r.dist || r["geninfo/dist"] || r.district || r.District || r._mapped_dist) === districtFilter;

      // Category (LULC or Texture)
      const rCat = activeTab === "ldn" ? r.landus : (r.tex || r["sampl/tex"] || r.texture || r._mapped_tex);
      const matchCategory = categoryFilter === "all" || rCat === categoryFilter;

      // Severity / Moisture
      const rExtra = activeTab === "ldn" ? r.sev : (r.moisture || r["sampl/moisture"] || r._mapped_moist);
      const matchExtra = severityOrMoistureFilter === "all" || rExtra === severityOrMoistureFilter;

      // UNCCD/Soil status (Hotspot vs Bright Spot)
      let matchesStatus = true;
      if (statusFilter !== "all") {
        if (activeTab === "ldn") {
          const sev = String(r.sev || "").toLowerCase();
          const isHotspot = sev.includes("high") || sev.includes("severe") || sev.includes("critical");
          const isBrightSpot = sev.includes("low") || sev.includes("minimal") || sev.includes("stable") || sev.includes("none");
          
          if (statusFilter === "hotspot" && !isHotspot) matchesStatus = false;
          if (statusFilter === "brightspot" && !isBrightSpot) matchesStatus = false;
        } else {
          const tex = String(r.tex || r["sampl/tex"] || r.texture || r._mapped_tex || "").toLowerCase();
          const moist = String(r.moisture || r["sampl/moisture"] || r._mapped_moist || "").toLowerCase();
          const isHotspot = tex.includes("sand") && moist.includes("dry");
          const isBrightSpot = tex.includes("loam") || tex.includes("silt");
          
          if (statusFilter === "hotspot" && !isHotspot) matchesStatus = false;
          if (statusFilter === "brightspot" && !isBrightSpot) matchesStatus = false;
        }
      }

      return matchesSearch && matchDistrict && matchCategory && matchExtra && matchesStatus;
    });

    // 2. Sorting
    return filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle nulls
      if (aVal === undefined || aVal === null) return sortDirection === "asc" ? 1 : -1;
      if (bVal === undefined || bVal === null) return sortDirection === "asc" ? -1 : 1;

      // Cast numeric fields
      if (sortField === "depth" || sortField === "dep" || sortField === "sampl/dep" || sortField === "ward") {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [activeTab, ldnRecords, soilRecords, searchQuery, statusFilter, districtFilter, categoryFilter, severityOrMoistureFilter, sortField, sortDirection]);

  // Tab dynamic KPI metrics
  const tabKPIs = useMemo(() => {
    const records = activeTab === "ldn" ? ldnRecords : soilRecords;
    const total = records.length;
    
    let hotspots = 0;
    let brightspots = 0;
    let totalDepthOrDist = 0;
    let countDepth = 0;
    const uniqueDistricts = new Set();

    records.forEach(r => {
      const dist = r.dist || r["geninfo/dist"] || r.district || r.District || r._mapped_dist;
      if (dist) uniqueDistricts.add(dist);

      if (activeTab === "ldn") {
        const sev = String(r.sev || "").toLowerCase();
        if (sev.includes("high") || sev.includes("severe") || sev.includes("critical")) hotspots++;
        if (sev.includes("low") || sev.includes("minimal") || sev.includes("stable") || sev.includes("none")) brightspots++;
      } else {
        const tex = String(r.tex || r["sampl/tex"] || r.texture || r._mapped_tex || "").toLowerCase();
        const moist = String(r.moisture || r["sampl/moisture"] || r._mapped_moist || "").toLowerCase();
        if (tex.includes("sand") && moist.includes("dry")) hotspots++;
        if (tex.includes("loam") || tex.includes("silt")) brightspots++;
        
        const dep = r.dep || r["sampl/dep"] || r.depth || r.Depth;
        if (dep && !isNaN(parseFloat(dep))) {
          totalDepthOrDist += parseFloat(dep);
          countDepth++;
        }
      }
    });

    return {
      total,
      hotspots,
      brightspots,
      uniqueDistricts: uniqueDistricts.size,
      avgDepth: countDepth > 0 ? (totalDepthOrDist / countDepth).toFixed(1) : "0"
    };
  }, [activeTab, ldnRecords, soilRecords]);

  // Current paginated slice
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedRecords.slice(start, start + itemsPerPage);
  }, [processedRecords, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(processedRecords.length / itemsPerPage));

  // Change sort field or flip direction
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // Export functions
  const handleDownload = (format: "csv" | "json", exportAll: boolean = false) => {
    const listToExport = exportAll 
      ? (activeTab === "ldn" ? ldnRecords : soilRecords)
      : processedRecords;

    if (listToExport.length === 0) {
      alert("No data available for export.");
      return;
    }

    const filename = `${activeTab}_dataset_${exportAll ? "all" : "filtered"}_${Date.now()}.${format}`;

    if (format === "json") {
      const jsonContent = JSON.stringify(listToExport, null, 2);
      downloadFile(jsonContent, filename, "application/json");
    } else {
      const csvContent = convertToCSV(listToExport);
      downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
    }
  };

  const getUnccdBadge = (r: any) => {
    if (activeTab === "ldn") {
      const sev = String(r.sev || "").toLowerCase();
      if (sev.includes("high") || sev.includes("severe") || sev.includes("critical")) {
        return <span className="site-badge danger-status">⚠️ Hotspot</span>;
      }
      if (sev.includes("low") || sev.includes("minimal") || sev.includes("stable") || sev.includes("none")) {
        return <span className="site-badge active-status">🌟 Bright Spot</span>;
      }
      return <span className="site-badge warning-status">Baseline</span>;
    } else {
      const tex = String(r.tex || r["sampl/tex"] || r.texture || r._mapped_tex || "").toLowerCase();
      const moist = String(r.moisture || r["sampl/moisture"] || r._mapped_moist || "").toLowerCase();
      
      if (tex.includes("sand") && moist.includes("dry")) {
        return <span className="site-badge danger-status">⚠️ Vulnerable</span>;
      }
      if (tex.includes("loam") || tex.includes("silt")) {
        return <span className="site-badge active-status">🌟 Fertile</span>;
      }
      return <span className="site-badge warning-status">Mixed</span>;
    }
  };

  const getSeverityOrMoistureBadge = (r: any) => {
    if (activeTab === "ldn") {
      const sev = r.sev || "Not Rated";
      const s = sev.toLowerCase();
      if (s.includes("high") || s.includes("severe")) {
        return <span className="site-badge danger-status" style={{fontSize: "10px"}}>{sev}</span>;
      }
      if (s.includes("moderate") || s.includes("medium")) {
        return <span className="site-badge warning-status" style={{fontSize: "10px"}}>{sev}</span>;
      }
      return <span className="site-badge active-status" style={{fontSize: "10px"}}>{sev}</span>;
    } else {
      const moist = r.moisture || r["sampl/moisture"] || r._mapped_moist || "Unknown";
      const m = moist.toLowerCase();
      if (m.includes("dry")) {
        return <span className="site-badge warning-status" style={{fontSize: "10px"}}>{moist}</span>;
      }
      if (m.includes("wet") || m.includes("moist")) {
        return <span className="site-badge active-status" style={{fontSize: "10px"}}>{moist}</span>;
      }
      return <span className="site-badge" style={{fontSize: "10px", background: "#e2e8f0", color: "#475569"}}>{moist}</span>;
    }
  };

  return (
    <div className="database-explorer-container" style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "20px", overflowY: "auto", gap: "20px" }}>
      
      {/* Header section */}
      <div className="explorer-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-title)", fontWeight: 800, fontSize: "22px", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={24} style={{ color: "var(--accent-green)" }} /> Database Explorer
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
            Inspect, query, filter, and download raw telemetry records collected via mobile field reports.
          </p>
        </div>
        
        {/* Sync / Refresh Button */}
        <button 
          onClick={loadData}
          disabled={loading}
          className="sidebar-export-btn"
          style={{ padding: "8px 14px", fontSize: "11px", gap: "6px", display: "flex", alignItems: "center", background: "#ffffff", border: "1px solid var(--border-color)", color: "var(--text-green)", cursor: "pointer", borderRadius: "var(--radius-md)" }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {loading ? "Syncing..." : "Sync Database"}
        </button>
      </div>

      {/* Primary Tab Switcher */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border-color)", gap: "10px", paddingBottom: "2px" }}>
        <button
          onClick={() => setActiveTab("ldn")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "ldn" ? "3px solid var(--accent-green)" : "3px solid transparent",
            color: activeTab === "ldn" ? "var(--text-green)" : "var(--text-muted)",
            fontWeight: activeTab === "ldn" ? 700 : 500,
            fontSize: "14px",
            padding: "8px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          🌳 Land Degradation (LDN)
        </button>
        <button
          onClick={() => setActiveTab("soil")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "soil" ? "3px solid var(--accent-amber)" : "3px solid transparent",
            color: activeTab === "soil" ? "var(--accent-amber)" : "var(--text-muted)",
            fontWeight: activeTab === "soil" ? 700 : 500,
            fontSize: "14px",
            padding: "8px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2"
          }}
        >
          🧪 Soil Core Samples
        </button>
      </div>

      {/* Loading Overlay */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "10px" }}>
          <div className="spinner" style={{ borderTopColor: activeTab === "ldn" ? "var(--accent-green)" : "var(--accent-amber)" }} />
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Reading database cache...</span>
        </div>
      ) : error ? (
        <div style={{ padding: "30px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid #ef4444", borderRadius: "var(--radius-lg)", color: "#ef4444", margin: "20px 0" }}>
          <h4 style={{ margin: 0, fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>⚠️ Loading Error</h4>
          <p style={{ fontSize: "12px", margin: "10px 0 0" }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Dynamic KPI Ribbon */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            <div className="home-kpi-card" style={{ padding: "12px", borderLeft: `4px solid ${activeTab === 'ldn' ? 'var(--accent-green)' : 'var(--accent-amber)'}` }}>
              <div className="home-kpi-card-num" style={{ fontSize: "20px", color: activeTab === 'ldn' ? 'var(--text-green)' : 'var(--accent-amber)' }}>{tabKPIs.total}</div>
              <div className="home-kpi-card-label" style={{ fontSize: "10px" }}>Total Records</div>
            </div>
            <div className="home-kpi-card" style={{ padding: "12px", borderLeft: "4px solid var(--accent-rose)" }}>
              <div className="home-kpi-card-num" style={{ fontSize: "20px", color: "var(--accent-rose)" }}>{tabKPIs.hotspots}</div>
              <div className="home-kpi-card-label" style={{ fontSize: "10px" }}>{activeTab === 'ldn' ? 'Degraded Hotspots' : 'Vulnerable Cores'}</div>
            </div>
            <div className="home-kpi-card" style={{ padding: "12px", borderLeft: "4px solid #10b981" }}>
              <div className="home-kpi-card-num" style={{ fontSize: "20px", color: "#10b981" }}>{tabKPIs.brightspots}</div>
              <div className="home-kpi-card-label" style={{ fontSize: "10px" }}>{activeTab === 'ldn' ? 'Restored Bright Spots' : 'Fertile Cores'}</div>
            </div>
            <div className="home-kpi-card" style={{ padding: "12px", borderLeft: "4px solid #3b82f6" }}>
              <div className="home-kpi-card-num" style={{ fontSize: "20px", color: "#3b82f6" }}>
                {activeTab === 'ldn' ? tabKPIs.uniqueDistricts : `${tabKPIs.avgDepth} cm`}
              </div>
              <div className="home-kpi-card-label" style={{ fontSize: "10px" }}>{activeTab === 'ldn' ? 'Districts Monitored' : 'Average Sampling Depth'}</div>
            </div>
          </div>

          {/* Filtering and Query Control Center */}
          <div className="home-kpi-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px", background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)" }}>
            
            {/* Upper filter bar: Search query and status dropdown */}
            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Query by District, Ward, Identifier, Observer agent..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 32px",
                    fontSize: "12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    outline: "none"
                  }}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{
                  width: "200px",
                  padding: "8px",
                  fontSize: "12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  background: "#ffffff",
                  outline: "none"
                }}
              >
                <option value="all">All Status Classes</option>
                <option value="hotspot">{activeTab === 'ldn' ? 'Degraded Hotspots ⚠️' : 'Vulnerable Cores ⚠️'}</option>
                <option value="brightspot">{activeTab === 'ldn' ? 'Restored Bright Spots 🌟' : 'Fertile Cores 🌟'}</option>
              </select>
            </div>

            {/* Lower filter bar: Specific columns */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              
              {/* District Filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Monitored District</label>
                <select
                  value={districtFilter}
                  onChange={(e) => { setDistrictFilter(e.target.value); setCurrentPage(1); }}
                  style={{ width: "160px", padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
                >
                  <option value="all">All Districts</option>
                  {filterOptions.districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* LULC / Texture Filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>
                  {activeTab === 'ldn' ? 'Land Cover (LULC)' : 'Soil Texture'}
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  style={{ width: "160px", padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
                >
                  <option value="all">{activeTab === 'ldn' ? 'All Land Covers' : 'All Textures'}</option>
                  {filterOptions.categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Severity / Moisture Filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>
                  {activeTab === 'ldn' ? 'Degradation Severity' : 'Moisture Status'}
                </label>
                <select
                  value={severityOrMoistureFilter}
                  onChange={(e) => { setSeverityOrMoistureFilter(e.target.value); setCurrentPage(1); }}
                  style={{ width: "160px", padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
                >
                  <option value="all">{activeTab === 'ldn' ? 'All Severities' : 'All Moisture Levels'}</option>
                  {filterOptions.extraOptions.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Reset trigger */}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setDistrictFilter("all");
                  setCategoryFilter("all");
                  setSeverityOrMoistureFilter("all");
                  setCurrentPage(1);
                }}
                style={{
                  alignSelf: "flex-end",
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  color: "#475569"
                }}
              >
                Reset Filters
              </button>

              {/* Export Downloads Center */}
              <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignSelf: "flex-end" }}>
                <button
                  onClick={() => handleDownload("csv", false)}
                  className="sidebar-export-btn"
                  style={{ padding: "6px 12px", fontSize: "11px", gap: "4px", background: activeTab === 'ldn' ? 'var(--accent-green)' : 'var(--accent-amber)' }}
                >
                  <Download size={11} /> Export CSV ({processedRecords.length})
                </button>
                <button
                  onClick={() => handleDownload("json", false)}
                  className="sidebar-export-btn"
                  style={{ padding: "6px 12px", fontSize: "11px", gap: "4px", background: "#475569" }}
                >
                  <Download size={11} /> Export JSON
                </button>
              </div>

            </div>
          </div>

          {/* Table Container */}
          <div className="home-kpi-card" style={{ padding: 0, overflow: "hidden", background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)" }}>
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                
                {/* Table Header */}
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700, width: "60px" }}>Idx</th>
                    <th 
                      onClick={() => handleSort("ceid")}
                      style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        Identifier <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("_submission_time")}
                      style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        Submission Date <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("dist")}
                      style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        District <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Ward</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Observer Agent</th>
                    
                    {activeTab === "ldn" ? (
                      <>
                        <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>LULC Cover</th>
                        <th 
                          onClick={() => handleSort("sev")}
                          style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            Severity <ArrowUpDown size={12} />
                          </div>
                        </th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Texture</th>
                        <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Moisture</th>
                        <th 
                          onClick={() => handleSort("dep")}
                          style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            Depth (cm) <ArrowUpDown size={12} />
                          </div>
                        </th>
                      </>
                    )}

                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700 }}>Framework Status</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 700, textAlign: "center" }}>Details</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={ activeTab === "ldn" ? 9 : 10 } style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                        No records match the active query. Try modifying your search or dropdown filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, index) => {
                      const rowIdx = (currentPage - 1) * itemsPerPage + index + 1;
                      const dateStr = r._submission_time ? new Date(r._submission_time).toLocaleDateString() : "—";
                      const dist = r.dist || r["geninfo/dist"] || r.district || r.District || r._mapped_dist || "—";
                      const ward = r.ward || "—";
                      const agent = r.agent || "—";
                      const ceid = r.ceid || r.samplid || r["sampl/samplid"] || "—";

                      return (
                        <tr 
                          key={r._id} 
                          style={{ 
                            borderBottom: "1px solid #f1f5f9", 
                            background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                            transition: "background 0.15s"
                          }}
                          className="hover-row"
                        >
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-muted)" }}>{rowIdx}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--text-primary)" }}>{ceid}</td>
                          <td style={{ padding: "12px 16px" }}>{dateStr}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>{dist}</td>
                          <td style={{ padding: "12px 16px" }}>Ward {ward}</td>
                          <td style={{ padding: "12px 16px" }}>{agent}</td>

                          {activeTab === "ldn" ? (
                            <>
                              <td style={{ padding: "12px 16px" }}>{r.landus || "—"}</td>
                              <td style={{ padding: "12px 16px" }}>{getSeverityOrMoistureBadge(r)}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.tex || r["sampl/tex"] || r.texture || r._mapped_tex || "—"}</td>
                              <td style={{ padding: "12px 16px" }}>{getSeverityOrMoistureBadge(r)}</td>
                              <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--accent-amber)" }}>{r.dep || r["sampl/dep"] || r.depth || r.Depth || "—"}</td>
                            </>
                          )}

                          <td style={{ padding: "12px 16px" }}>{getUnccdBadge(r)}</td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <button
                              onClick={() => setInspectRecord(r)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--accent-blue)",
                                cursor: "pointer",
                                padding: "4px",
                                display: "inline-flex",
                                alignItems: "center"
                              }}
                              title="Inspect complete metadata JSON schema"
                            >
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

              </table>
            </div>

            {/* Pagination Panel */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderTop: "1px solid var(--border-color)", background: "#f8fafc", flexWrap: "wrap", gap: "10px" }}>
              
              {/* Left: Size selection and totals */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                  <span>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                    style={{ padding: "4px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "4px", background: "#ffffff" }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>rows</span>
                </div>
                
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Showing <strong>{processedRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong>{Math.min(processedRecords.length, currentPage * itemsPerPage)}</strong> of <strong>{processedRecords.length}</strong> queried entries
                </span>
              </div>

              {/* Right: Page navigation */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px",
                    background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "4px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                
                <span style={{ fontSize: "11px", color: "var(--text-primary)", fontWeight: 600 }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px",
                    background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "4px",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

            </div>

          </div>
        </>
      )}

      {/* Inspection Modal Overlay */}
      {inspectRecord && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(11, 34, 20, 0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "20px"
        }}>
          <div style={{
            background: "#ffffff", border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "700px",
            maxHeight: "85vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid var(--border-color)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 800, fontSize: "15px", color: "var(--text-primary)" }}>
                  Metadata Inspection Schema
                </h3>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>ID: {inspectRecord._id}</span>
              </div>
              <button
                onClick={() => setInspectRecord(null)}
                style={{
                  background: "none", border: "none", color: "var(--text-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Highlight Card */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
                padding: "12px", background: "rgba(6, 75, 34, 0.03)",
                border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <MapPin size={14} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>District & Ward</div>
                    <strong>{inspectRecord.dist || inspectRecord._mapped_dist || "Unspecified"} (Ward {inspectRecord.ward || "—"})</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Submission Time</div>
                    <strong>{inspectRecord._submission_time ? new Date(inspectRecord._submission_time).toLocaleString() : "—"}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <User size={14} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Surveyor Agent</div>
                    <strong>{inspectRecord.agent || "—"}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <Activity size={14} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Framework Status</div>
                    <div style={{ marginTop: "2px" }}>{getUnccdBadge(inspectRecord)}</div>
                  </div>
                </div>
              </div>

              {/* JSON tree viewer */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Complete Raw Key-Value JSON Schema
                </label>
                <pre style={{
                  padding: "12px", background: "#0f172a", color: "#38bdf8",
                  borderRadius: "var(--radius-md)", fontSize: "11px", overflowX: "auto",
                  fontFamily: "monospace", margin: 0, maxHeight: "250px", lineHeight: "1.5"
                }}>
                  {JSON.stringify(inspectRecord, null, 2)}
                </pre>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "14px 20px", borderTop: "1px solid var(--border-color)",
              background: "#f8fafc", display: "flex", justifyContent: "flex-end",
              borderBottomLeftRadius: "var(--radius-lg)", borderBottomRightRadius: "var(--radius-lg)"
            }}>
              <button
                onClick={() => setInspectRecord(null)}
                style={{
                  padding: "8px 16px", fontSize: "12px", fontWeight: 600,
                  background: "#ffffff", border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)", cursor: "pointer", color: "var(--text-primary)"
                }}
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
