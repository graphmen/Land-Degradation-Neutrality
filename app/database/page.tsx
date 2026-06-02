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
  MapPin,
  Calendar,
  User,
  Activity,
  Plus,
  Edit2,
  Trash2,
  History,
  RotateCcw,
  Eye,
  Check
} from "lucide-react";
import { downloadFile, convertToCSV, convertToGeoJSON, convertToKML } from "@/lib/export";

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

const DISTRICT_LIST = [
  "Chimanimani",
  "Bikita",
  "Buhera",
  "Chipinge",
  "Masvingo",
  "Mutare",
  "Gutu",
  "Zaka",
  "Chivi"
];

const LANDUSE_LIST = [
  "Cropland",
  "Tree/Forest",
  "Grassland",
  "Bush/Shrub",
  "Wetland",
  "Settlements",
  "Other Land"
];

const SEVERITY_LIST = [
  "None",
  "Slight",
  "Moderate",
  "Severe",
  "Critical"
];

const SOIL_TEXTURE_LIST = [
  "sand",
  "clay",
  "loam",
  "sanlo",
  "cllo",
  "silt"
];

export default function DatabaseExplorer() {
  const [activeTab, setActiveTab] = useState<"ldn" | "soil">("ldn");
  
  // Data states
  const [ldnRecords, setLdnRecords] = useState<any[]>([]);
  const [soilRecords, setSoilRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modification trackers
  const [ldnMods, setLdnMods] = useState<any>({ additions: [], deletions: [], edits: {} });
  const [soilMods, setSoilMods] = useState<any>({ additions: [], deletions: [], edits: {}, parentEdits: {} });
  
  // Selection states
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all"); // LULC for LDN, Texture for Soil
  const [severityOrMoistureFilter, setSeverityOrMoistureFilter] = useState("all"); // Severity for LDN, Moisture for Soil
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Increased default density
  
  // Sorting states
  const [sortField, setSortField] = useState<string>("_submission_time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Column Visibility state
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    idx: true,
    identifier: true,
    submission_time: true,
    district: true,
    ward: true,
    agent: true,
    landus: true,
    sev: true,
    tex: true,
    moisture: true,
    dep: true,
    status: true,
    actions: true
  });
  
  // Modals & overlay states
  const [inspectRecord, setInspectRecord] = useState<any | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  
  // Form handling states
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch datasets & raw modifications
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ldnRes, soilRes, ldnModifications, soilModifications] = await Promise.all([
        fetch("/api/ldn?limit=5000", { cache: "no-store" }).then(r => r.json()).catch(() => ({ records: [] })),
        fetch("/api/soil?limit=5000", { cache: "no-store" }).then(r => r.json()).catch(() => ({ records: [] })),
        fetch("/api/ldn?action=modifications", { cache: "no-store" }).then(r => r.json()).catch(() => ({ additions: [], deletions: [], edits: {} })),
        fetch("/api/soil?action=modifications", { cache: "no-store" }).then(r => r.json()).catch(() => ({ additions: [], deletions: [], edits: {}, parentEdits: {} }))
      ]);

      const normalisedLdn = (ldnRes.records ?? []).map(normalise);
      const normalisedSoil = extractSoilSamples((soilRes.records ?? []).map(normalise));
      
      setLdnRecords(normalisedLdn);
      setSoilRecords(normalisedSoil);
      setLdnMods(ldnModifications);
      setSoilMods(soilModifications);
    } catch (e: any) {
      setError(e.message || "Failed to load telemetry datasets from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset page, queries & selection when switching tabs
  useEffect(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setDistrictFilter("all");
    setCategoryFilter("all");
    setSeverityOrMoistureFilter("all");
    setCurrentPage(1);
    setSelectedRows(new Set());
    setSortField("_submission_time");
    setSortDirection("desc");
  }, [activeTab]);

  // Determine active modification tracker
  const activeMods = activeTab === "ldn" ? ldnMods : soilMods;
  const activeRecords = activeTab === "ldn" ? ldnRecords : soilRecords;

  // Dynamic filter dropdown options
  const filterOptions = useMemo(() => {
    const records = activeTab === "ldn" ? ldnRecords : soilRecords;
    const districts = new Set<string>();
    const categories = new Set<string>();
    const extraOptions = new Set<string>();

    records.forEach(r => {
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
    
    const filtered = rawList.filter(r => {
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

      const matchDistrict = districtFilter === "all" || 
        (r.dist || r["geninfo/dist"] || r.district || r.District || r._mapped_dist) === districtFilter;

      const rCat = activeTab === "ldn" ? r.landus : (r.tex || r["sampl/tex"] || r.texture || r._mapped_tex);
      const matchCategory = categoryFilter === "all" || rCat === categoryFilter;

      const rExtra = activeTab === "ldn" ? r.sev : (r.moisture || r["sampl/moisture"] || r._mapped_moist);
      const matchExtra = severityOrMoistureFilter === "all" || rExtra === severityOrMoistureFilter;

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

    return filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === undefined || aVal === null) return sortDirection === "asc" ? 1 : -1;
      if (bVal === undefined || bVal === null) return sortDirection === "asc" ? -1 : 1;

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

  // Tab KPI calculations
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

  // Sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // Checkbox toggle events
  const handleSelectAll = (checked: boolean) => {
    const nextSelection = new Set(selectedRows);
    paginatedRecords.forEach(r => {
      const rid = String(r._id);
      if (checked) {
        nextSelection.add(rid);
      } else {
        nextSelection.delete(rid);
      }
    });
    setSelectedRows(nextSelection);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const nextSelection = new Set(selectedRows);
    if (checked) {
      nextSelection.add(id);
    } else {
      nextSelection.delete(id);
    }
    setSelectedRows(nextSelection);
  };

  // Reversion operations
  const handleRevert = async (id: string) => {
    try {
      const res = await fetch(`/api/${activeTab}?action=revert&id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedRows(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        await loadData();
      }
    } catch (e) {
      alert("Failed to revert override record.");
    }
  };

  const handleRevertAll = async () => {
    if (!confirm("Are you sure you want to revert all local database additions, modifications, and deletions?")) return;
    try {
      const res = await fetch(`/api/${activeTab}?action=revertAll`, { method: "DELETE" });
      if (res.ok) {
        setSelectedRows(new Set());
        setIsHistoryPanelOpen(false);
        await loadData();
      }
    } catch (e) {
      alert("Failed to revert all changes.");
    }
  };

  // Deletion operation
  const handleDeleteRow = async (id: string) => {
    if (!confirm("Are you sure you want to mark this record as deleted?")) return;
    try {
      const res = await fetch(`/api/${activeTab}?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedRows(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        await loadData();
      }
    } catch (e) {
      alert("Failed to delete record.");
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedRows.size} selected records?`)) return;
    
    try {
      const ids = Array.from(selectedRows).join(",");
      const res = await fetch(`/api/${activeTab}?id=${ids}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedRows(new Set());
        await loadData();
      }
    } catch (e) {
      alert("Bulk delete operation failed.");
    }
  };

  const handleBulkExport = (format: "csv" | "json" | "geojson" | "kml") => {
    const listToExport = activeRecords.filter(r => selectedRows.has(String(r._id)));
    if (listToExport.length === 0) return;
    
    const ext = format === "geojson" ? "geojson" : format;
    const filename = `${activeTab}_selected_${Date.now()}.${ext}`;
    
    if (format === "json") {
      downloadFile(JSON.stringify(listToExport, null, 2), filename, "application/json");
    } else if (format === "geojson") {
      const geojsonObj = convertToGeoJSON(listToExport);
      downloadFile(JSON.stringify(geojsonObj, null, 2), filename, "application/geo+json");
    } else if (format === "kml") {
      const geojsonObj = convertToGeoJSON(listToExport);
      const kmlContent = convertToKML(geojsonObj.features, `${activeTab.toUpperCase()} Selected Export`);
      downloadFile(kmlContent, filename, "application/vnd.google-earth.kml+xml");
    } else {
      downloadFile(convertToCSV(listToExport), filename, "text/csv;charset=utf-8;");
    }
    setSelectedRows(new Set());
  };

  // Form submit add/edit handlers
  const openAddModal = () => {
    setFormError(null);
    if (activeTab === "ldn") {
      setFormData({
        ceid: "",
        dist: DISTRICT_LIST[0],
        ward: "1",
        agent: "Admin",
        landus: LANDUSE_LIST[0],
        sev: SEVERITY_LIST[0],
        lat: "-19.73",
        lng: "32.41"
      });
    } else {
      setFormData({
        ceid: "",
        dist: DISTRICT_LIST[0],
        ward: "1",
        agent: "Admin",
        samloc: "cent",
        tex: SOIL_TEXTURE_LIST[0],
        moisture: "No",
        dep: "30",
        lat: "-19.73",
        lng: "32.41"
      });
    }
    setIsAddModalOpen(true);
  };

  const openEditModal = (r: any) => {
    setFormError(null);
    setEditingRecord(r);
    
    if (activeTab === "ldn") {
      const gpsStr = r["geninfo/GPS"] || r.GPS || "";
      const parts = gpsStr.split(" ");
      setFormData({
        ceid: r.ceid || r["geninfo/ceid"] || "",
        dist: r.dist || r["geninfo/dist"] || DISTRICT_LIST[0],
        ward: r.ward || r["geninfo/ward"] || "1",
        agent: r.agent || r["geninfo/Team"] || "Admin",
        landus: r.landus || r["poidet/landus"] || LANDUSE_LIST[0],
        sev: r.sev || r["ldi/sev"] || SEVERITY_LIST[0],
        lat: parts[0] || "-19.73",
        lng: parts[1] || "32.41"
      });
    } else {
      const poinStr = r["sampl/poin"] || r.poin || "";
      const parts = poinStr.split(" ");
      setFormData({
        ceid: r.ceid || r["geninfo/ceid"] || "",
        dist: r.dist || r["geninfo/dist"] || DISTRICT_LIST[0],
        ward: r.ward || r["geninfo/ward"] || "1",
        agent: r.agent || r["geninfo/Team"] || "Admin",
        samloc: r.samloc || r["sampl/samloc"] || "cent",
        tex: r.tex || r["sampl/tex"] || SOIL_TEXTURE_LIST[0],
        moisture: r.moisture || r["sampl/moisture"] || "No",
        dep: r.dep || r["sampl/dep"] || "30",
        lat: parts[0] || "-19.73",
        lng: parts[1] || "32.41"
      });
    }
    setIsEditModalOpen(true);
  };

  const handleFormChange = (key: string, val: string) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ceid) {
      setFormError("Identifier is required.");
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      const payload: any = { ...formData };
      if (activeTab === "ldn") {
        payload["geninfo/ceid"] = formData.ceid;
        payload["geninfo/dist"] = formData.dist;
        payload["geninfo/ward"] = formData.ward;
        payload["geninfo/Team"] = formData.agent;
        payload["poidet/landus"] = formData.landus;
        payload["ldi/sev"] = formData.sev;
        payload["geninfo/GPS"] = `${formData.lat} ${formData.lng} 0 0`;
      } else {
        payload["geninfo/ceid"] = formData.ceid;
        payload["geninfo/dist"] = formData.dist;
        payload["geninfo/ward"] = formData.ward;
        payload["geninfo/Team"] = formData.agent;
        payload["sampl/samloc"] = formData.samloc;
        payload["sampl/tex"] = formData.tex;
        payload["sampl/moisture"] = formData.moisture;
        payload["sampl/dep"] = formData.dep;
        payload["sampl/poin"] = `${formData.lat} ${formData.lng} 0 0`;
        payload.poin = payload["sampl/poin"];
      }

      if (isEditModalOpen && editingRecord) {
        payload._id = editingRecord._id;
        const res = await fetch(`/api/${activeTab}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          setIsEditModalOpen(false);
          await loadData();
        } else {
          const json = await res.json();
          setFormError(json.error || "Failed to update record on server.");
        }
      } else {
        const res = await fetch(`/api/${activeTab}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          setIsAddModalOpen(false);
          await loadData();
        } else {
          const json = await res.json();
          setFormError(json.error || "Failed to add record to local modifications.");
        }
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export functions (For whole dataset)
  const handleDownload = (format: "csv" | "json" | "geojson" | "kml", exportAll: boolean = false) => {
    const listToExport = exportAll 
      ? activeRecords
      : processedRecords;

    if (listToExport.length === 0) {
      alert("No data available for export.");
      return;
    }

    const ext = format === "geojson" ? "geojson" : format;
    const filename = `${activeTab}_dataset_${exportAll ? "all" : "filtered"}_${Date.now()}.${ext}`;

    if (format === "json") {
      downloadFile(JSON.stringify(listToExport, null, 2), filename, "application/json");
    } else if (format === "geojson") {
      const geojsonObj = convertToGeoJSON(listToExport);
      downloadFile(JSON.stringify(geojsonObj, null, 2), filename, "application/geo+json");
    } else if (format === "kml") {
      const geojsonObj = convertToGeoJSON(listToExport);
      const kmlContent = convertToKML(geojsonObj.features, `${activeTab.toUpperCase()} Data Export`);
      downloadFile(kmlContent, filename, "application/vnd.google-earth.kml+xml");
    } else {
      const csvContent = convertToCSV(listToExport);
      downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
    }
  };

  // Badging helper functions
  const getUnccdBadge = (r: any) => {
    if (activeTab === "ldn") {
      const sev = String(r.sev || "").toLowerCase();
      if (sev.includes("high") || sev.includes("severe") || sev.includes("critical")) {
        return <span className="site-badge danger-status" style={{ padding: "1px 6px", fontSize: "10px" }}>⚠️ Hotspot</span>;
      }
      if (sev.includes("low") || sev.includes("minimal") || sev.includes("stable") || sev.includes("none")) {
        return <span className="site-badge active-status" style={{ padding: "1px 6px", fontSize: "10px" }}>🌟 Bright Spot</span>;
      }
      return <span className="site-badge warning-status" style={{ padding: "1px 6px", fontSize: "10px" }}>Baseline</span>;
    } else {
      const tex = String(r.tex || r["sampl/tex"] || r.texture || r._mapped_tex || "").toLowerCase();
      const moist = String(r.moisture || r["sampl/moisture"] || r._mapped_moist || "").toLowerCase();
      
      if (tex.includes("sand") && moist.includes("dry")) {
        return <span className="site-badge danger-status" style={{ padding: "1px 6px", fontSize: "10px" }}>⚠️ Vulnerable</span>;
      }
      if (tex.includes("loam") || tex.includes("silt")) {
        return <span className="site-badge active-status" style={{ padding: "1px 6px", fontSize: "10px" }}>🌟 Fertile</span>;
      }
      return <span className="site-badge warning-status" style={{ padding: "1px 6px", fontSize: "10px" }}>Mixed</span>;
    }
  };

  const getSeverityOrMoistureBadge = (r: any) => {
    if (activeTab === "ldn") {
      const sev = r.sev || "Not Rated";
      const s = sev.toLowerCase();
      if (s.includes("high") || s.includes("severe")) {
        return <span className="site-badge danger-status" style={{fontSize: "9px", padding: "1px 4px"}}>{sev}</span>;
      }
      if (s.includes("moderate") || s.includes("medium")) {
        return <span className="site-badge warning-status" style={{fontSize: "9px", padding: "1px 4px"}}>{sev}</span>;
      }
      return <span className="site-badge active-status" style={{fontSize: "9px", padding: "1px 4px"}}>{sev}</span>;
    } else {
      const moist = r.moisture || r["sampl/moisture"] || r._mapped_moist || "Unknown";
      const m = moist.toLowerCase();
      if (m.includes("dry")) {
        return <span className="site-badge warning-status" style={{fontSize: "9px", padding: "1px 4px"}}>{moist}</span>;
      }
      if (m.includes("wet") || m.includes("moist")) {
        return <span className="site-badge active-status" style={{fontSize: "9px", padding: "1px 4px"}}>{moist}</span>;
      }
      return <span className="site-badge" style={{fontSize: "9px", padding: "1px 4px", background: "#e2e8f0", color: "#475569"}}>{moist}</span>;
    }
  };

  const totalModifications = activeMods.additions.length + 
    activeMods.deletions.length + 
    Object.keys(activeMods.edits).length + 
    (activeMods.parentEdits ? Object.keys(activeMods.parentEdits).length : 0);

  return (
    <div className="database-explorer-container" style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "10px 14px", overflow: "hidden", gap: "10px", position: "relative" }}>
      
      {/* Dynamic Keyframes Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .bulk-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .revert-btn:hover {
          background-color: rgba(0,0,0,0.05) !important;
          color: var(--accent-rose) !important;
        }
      `}} />

      {/* Header section (Compact) */}
      <div className="explorer-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <h2 style={{ fontFamily: "var(--font-title)", fontWeight: 800, fontSize: "18px", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
          <Database size={20} style={{ color: "var(--accent-green)" }} /> Database Explorer
        </h2>
        
        {/* Top Actions */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button 
            onClick={() => setIsHistoryPanelOpen(true)}
            style={{ 
              padding: "6px 12px", fontSize: "11px", gap: "4px", display: "flex", alignItems: "center", 
              background: totalModifications > 0 ? "rgba(217,119,6,0.1)" : "#ffffff", 
              border: totalModifications > 0 ? "1px solid var(--accent-amber)" : "1px solid var(--border-color)", 
              color: totalModifications > 0 ? "var(--accent-amber)" : "var(--text-muted)", 
              cursor: "pointer", borderRadius: "var(--radius-md)", fontWeight: 600
            }}
          >
            <History size={12} /> Overrides ({totalModifications})
          </button>

          <button 
            onClick={openAddModal}
            style={{ 
              padding: "6px 12px", fontSize: "11px", gap: "4px", display: "flex", alignItems: "center", 
              background: "var(--accent-green)", border: "none", color: "#ffffff",
              cursor: "pointer", borderRadius: "var(--radius-md)", fontWeight: 600
            }}
          >
            <Plus size={12} /> Add Record
          </button>

          <button 
            onClick={loadData}
            disabled={loading}
            className="sidebar-export-btn"
            style={{ padding: "6px 12px", fontSize: "11px", gap: "4px", display: "flex", alignItems: "center", background: "#ffffff", border: "1px solid var(--border-color)", color: "var(--text-green)", cursor: "pointer", borderRadius: "var(--radius-md)" }}
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> {loading ? "Syncing..." : "Sync Database"}
          </button>
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border-color)", gap: "10px", paddingBottom: "2px", flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab("ldn")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "ldn" ? "3px solid var(--accent-green)" : "3px solid transparent",
            color: activeTab === "ldn" ? "var(--text-green)" : "var(--text-muted)",
            fontWeight: activeTab === "ldn" ? 700 : 500,
            fontSize: "13px",
            padding: "4px 8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
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
            fontSize: "13px",
            padding: "4px 8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
        >
          🧪 Soil Core Samples
        </button>
      </div>

      {/* Loading Overlay */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "10px" }}>
          <div className="spinner" style={{ borderTopColor: activeTab === "ldn" ? "var(--accent-green)" : "var(--accent-amber)" }} />
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Reading database cache...</span>
        </div>
      ) : error ? (
        <div style={{ padding: "20px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid #ef4444", borderRadius: "var(--radius-lg)", color: "#ef4444", margin: "10px 0" }}>
          <h4 style={{ margin: 0, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>⚠️ Loading Error</h4>
          <p style={{ fontSize: "11px", margin: "6px 0 0" }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Dynamic KPI Ribbon (Ultra-compact metrics bar) */}
          <div style={{
            display: "flex", gap: "14px", padding: "6px 12px", background: "rgba(0, 102, 51, 0.02)",
            border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", alignItems: "center", flexWrap: "wrap", flexShrink: 0
          }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Metrics:</span>
            
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px" }}>
              <span style={{ fontWeight: 700, color: activeTab === 'ldn' ? 'var(--text-green)' : 'var(--accent-amber)' }}>{tabKPIs.total}</span>
              <span style={{ color: "var(--text-muted)" }}>Total Records</span>
            </div>
            <div style={{ width: "1px", height: "10px", background: "var(--border-color)" }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px" }}>
              <span style={{ fontWeight: 700, color: "var(--accent-rose)" }}>{tabKPIs.hotspots}</span>
              <span style={{ color: "var(--text-muted)" }}>{activeTab === 'ldn' ? 'Degraded Hotspots' : 'Vulnerable Cores'}</span>
            </div>
            <div style={{ width: "1px", height: "10px", background: "var(--border-color)" }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px" }}>
              <span style={{ fontWeight: 700, color: "#10b981" }}>{tabKPIs.brightspots}</span>
              <span style={{ color: "var(--text-muted)" }}>{activeTab === 'ldn' ? 'Restored Bright Spots' : 'Fertile Cores'}</span>
            </div>
            <div style={{ width: "1px", height: "10px", background: "var(--border-color)" }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px" }}>
              <span style={{ fontWeight: 700, color: "#3b82f6" }}>
                {activeTab === 'ldn' ? tabKPIs.uniqueDistricts : `${tabKPIs.avgDepth} cm`}
              </span>
              <span style={{ color: "var(--text-muted)" }}>{activeTab === 'ldn' ? 'Districts Monitored' : 'Avg Depth'}</span>
            </div>
          </div>

          {/* Filtering and Query Control Center (Compact Single Row) */}
          <div style={{
            padding: "6px 10px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center",
            background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-sm)", flexShrink: 0
          }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: "1 1 200px", minWidth: "160px" }}>
              <Search size={12} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Query by District, Ward, Identifier, Agent..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{
                  width: "100%",
                  padding: "4px 8px 4px 26px",
                  fontSize: "11px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  outline: "none"
                }}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {/* District Selector */}
            <select
              value={districtFilter}
              onChange={(e) => { setDistrictFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: "4px 6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
            >
              <option value="all">All Districts</option>
              {filterOptions.districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* LULC Cover / Texture Selector */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: "4px 6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
            >
              <option value="all">{activeTab === 'ldn' ? 'All Land Covers' : 'All Textures'}</option>
              {filterOptions.categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Severity / Moisture Selector */}
            <select
              value={severityOrMoistureFilter}
              onChange={(e) => { setSeverityOrMoistureFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: "4px 6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
            >
              <option value="all">{activeTab === 'ldn' ? 'All Severities' : 'All Moisture Levels'}</option>
              {filterOptions.extraOptions.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            {/* Hotspot/Brightspot Selector */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: "4px 6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
            >
              <option value="all">All Status Classes</option>
              <option value="hotspot">{activeTab === 'ldn' ? 'Degraded Hotspots ⚠️' : 'Vulnerable Cores ⚠️'}</option>
              <option value="brightspot">{activeTab === 'ldn' ? 'Restored Bright Spots 🌟' : 'Fertile Cores 🌟'}</option>
            </select>

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
                padding: "4px 8px", fontSize: "11px", fontWeight: 600,
                background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "var(--radius-sm)",
                cursor: "pointer", color: "#475569"
              }}
            >
              Reset
            </button>

            <div style={{ width: "1px", height: "14px", background: "var(--border-color)" }} />

            {/* Columns Dropdown Trigger */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowColumnDropdown(prev => !prev)}
                style={{
                  padding: "4px 8px", fontSize: "11px", fontWeight: 600,
                  background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "var(--radius-sm)",
                  cursor: "pointer", color: "#475569"
                }}
              >
                👁️ Columns
              </button>
              {showColumnDropdown && (
                <div style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  marginBottom: "6px",
                  background: "#ffffff",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-md)",
                  padding: "8px",
                  zIndex: 100,
                  width: "180px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)", paddingBottom: "4px" }}>
                    Toggle Columns
                  </div>
                  {Object.keys(visibleColumns).map(col => {
                    if (activeTab === "ldn" && ["tex", "moisture", "dep"].includes(col)) return null;
                    if (activeTab === "soil" && ["landus", "sev"].includes(col)) return null;
                    
                    const label = col === "idx" ? "Index Row"
                      : col === "submission_time" ? "Submission Date" 
                      : col === "landus" ? "LULC Cover"
                      : col === "sev" ? "Severity"
                      : col === "tex" ? "Texture"
                      : col === "dep" ? "Depth"
                      : col.charAt(0).toUpperCase() + col.slice(1);
                      
                    return (
                      <label key={col} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", cursor: "pointer", color: "var(--text-primary)" }}>
                        <input
                          type="checkbox"
                          checked={visibleColumns[col]}
                          onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                          style={{ cursor: "pointer" }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Export Downloads */}
            <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
              <button
                onClick={() => handleDownload("csv", false)}
                style={{
                  padding: "4px 8px", fontSize: "11px", fontWeight: 600,
                  background: activeTab === 'ldn' ? 'var(--accent-green)' : 'var(--accent-amber)',
                  color: "#ffffff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px"
                }}
              >
                <Download size={10} /> CSV ({processedRecords.length})
              </button>
              <button
                onClick={() => handleDownload("json", false)}
                style={{
                  padding: "4px 8px", fontSize: "11px", fontWeight: 600,
                  background: "#475569", color: "#ffffff", border: "none",
                  borderRadius: "var(--radius-sm)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px"
                }}
              >
                <Download size={10} /> JSON
              </button>
              <button
                onClick={() => handleDownload("geojson", false)}
                style={{
                  padding: "4px 8px", fontSize: "11px", fontWeight: 600,
                  background: "var(--accent-blue)", color: "#ffffff", border: "none",
                  borderRadius: "var(--radius-sm)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px"
                }}
              >
                <Download size={10} /> GeoJSON
              </button>
              <button
                onClick={() => handleDownload("kml", false)}
                style={{
                  padding: "4px 8px", fontSize: "11px", fontWeight: 600,
                  background: "var(--accent-gold)", color: "var(--text-primary)", border: "none",
                  borderRadius: "var(--radius-sm)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px"
                }}
              >
                <Download size={10} /> KML
              </button>
            </div>

          </div>

          {/* Table Container - Expands to occupy all remaining vertical space */}
          <div style={{
            display: "flex", flexDirection: "column", flex: 1, overflow: "hidden",
            background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)"
          }}>
            <div style={{ overflow: "auto", flex: 1, width: "100%" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "11px" }}>
                
                {/* Table Header (Sticky) */}
                <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc", boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "6px 8px", width: "40px", textAlign: "center" }}>
                      <input 
                        type="checkbox" 
                        style={{ cursor: "pointer" }}
                        checked={paginatedRecords.length > 0 && paginatedRecords.every(r => selectedRows.has(String(r._id)))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    {visibleColumns.idx && <th style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700, width: "50px" }}>Idx</th>}
                    {visibleColumns.identifier && (
                      <th 
                        onClick={() => handleSort("ceid")}
                        style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          Identifier <ArrowUpDown size={11} />
                        </div>
                      </th>
                    )}
                    {visibleColumns.submission_time && (
                      <th 
                        onClick={() => handleSort("_submission_time")}
                        style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          Submission Date <ArrowUpDown size={11} />
                        </div>
                      </th>
                    )}
                    {visibleColumns.district && (
                      <th 
                        onClick={() => handleSort("dist")}
                        style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          District <ArrowUpDown size={11} />
                        </div>
                      </th>
                    )}
                    {visibleColumns.ward && <th style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700 }}>Ward</th>}
                    {visibleColumns.agent && <th style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700 }}>Observer Agent</th>}
                    
                    {activeTab === "ldn" ? (
                      <>
                        {visibleColumns.landus && <th style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700 }}>LULC Cover</th>}
                        {visibleColumns.sev && (
                          <th 
                            onClick={() => handleSort("sev")}
                            style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              Severity <ArrowUpDown size={11} />
                            </div>
                          </th>
                        )}
                      </>
                    ) : (
                      <>
                        {visibleColumns.tex && <th style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700 }}>Texture</th>}
                        {visibleColumns.moisture && <th style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700 }}>Moisture</th>}
                        {visibleColumns.dep && (
                          <th 
                            onClick={() => handleSort("dep")}
                            style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              Depth (cm) <ArrowUpDown size={11} />
                            </div>
                          </th>
                        )}
                      </>
                    )}

                    {visibleColumns.status && <th style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700 }}>Framework Status</th>}
                    {visibleColumns.actions && <th style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 700, textAlign: "center", width: "100px" }}>Actions</th>}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={ activeTab === "ldn" ? 11 : 12 } style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                        No records match the active query. Try modifying your search or dropdown filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, index) => {
                      const rid = String(r._id);
                      const rowIdx = (currentPage - 1) * itemsPerPage + index + 1;
                      const dateStr = r._submission_time ? new Date(r._submission_time).toLocaleDateString() : "—";
                      const dist = r.dist || r["geninfo/dist"] || r.district || r.District || r._mapped_dist || "—";
                      const ward = r.ward || "—";
                      const agent = r.agent || "—";
                      const ceid = r.ceid || r.samplid || r["sampl/samplid"] || "—";

                      return (
                        <tr 
                          key={rid} 
                          style={{ 
                            borderBottom: "1px solid #f1f5f9", 
                            background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                            transition: "background 0.15s"
                          }}
                          className="hover-row"
                        >
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>
                            <input 
                              type="checkbox" 
                              style={{ cursor: "pointer" }}
                              checked={selectedRows.has(rid)}
                              onChange={(e) => handleSelectRow(rid, e.target.checked)}
                            />
                          </td>
                          {visibleColumns.idx && <td style={{ padding: "6px 8px", fontWeight: 600, color: "var(--text-muted)" }}>{rowIdx}</td>}
                          {visibleColumns.identifier && (
                            <td style={{ padding: "6px 8px", fontWeight: 700, color: "var(--text-primary)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {ceid}
                                {r._localStatus === "local" && (
                                  <span style={{
                                    background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)",
                                    padding: "1px 5px", borderRadius: "10px", fontSize: "8px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px"
                                  }}>
                                    <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#10b981" }} /> LOCAL
                                  </span>
                                )}
                                {r._localStatus === "modified" && (
                                  <span style={{
                                    background: "rgba(245,158,11,0.1)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)",
                                    padding: "1px 5px", borderRadius: "10px", fontSize: "8px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px"
                                  }}>
                                    <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#d97706" }} /> MOD
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.submission_time && <td style={{ padding: "6px 8px" }}>{dateStr}</td>}
                          {visibleColumns.district && <td style={{ padding: "6px 8px", fontWeight: 600 }}>{dist}</td>}
                          {visibleColumns.ward && <td style={{ padding: "6px 8px" }}>Ward {ward}</td>}
                          {visibleColumns.agent && <td style={{ padding: "6px 8px" }}>{agent}</td>}

                          {activeTab === "ldn" ? (
                            <>
                              {visibleColumns.landus && <td style={{ padding: "6px 8px" }}>{r.landus || "—"}</td>}
                              {visibleColumns.sev && <td style={{ padding: "6px 8px" }}>{getSeverityOrMoistureBadge(r)}</td>}
                            </>
                          ) : (
                            <>
                              {visibleColumns.tex && <td style={{ padding: "6px 8px", fontWeight: 600 }}>{r.tex || r["sampl/tex"] || r.texture || r._mapped_tex || "—"}</td>}
                              {visibleColumns.moisture && <td style={{ padding: "6px 8px" }}>{getSeverityOrMoistureBadge(r)}</td>}
                              {visibleColumns.dep && <td style={{ padding: "6px 8px", fontWeight: 700, color: "var(--accent-amber)" }}>{r.dep || r["sampl/dep"] || r.depth || r.Depth || "—"}</td>}
                            </>
                          )}

                          {visibleColumns.status && <td style={{ padding: "6px 8px" }}>{getUnccdBadge(r)}</td>}
                          
                          {visibleColumns.actions && (
                            <td style={{ padding: "6px 8px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "2px", justifyContent: "center" }}>
                                <button
                                  onClick={() => setInspectRecord(r)}
                                  style={{ background: "none", border: "none", color: "var(--accent-blue)", cursor: "pointer", padding: "2px" }}
                                  title="Inspect full JSON"
                                >
                                  <Info size={12} />
                                </button>
                                <button
                                  onClick={() => openEditModal(r)}
                                  style={{ background: "none", border: "none", color: "var(--accent-amber)", cursor: "pointer", padding: "2px" }}
                                  title="Edit Record"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRow(rid)}
                                  style={{ background: "none", border: "none", color: "var(--accent-rose)", cursor: "pointer", padding: "2px" }}
                                  title="Delete Record"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>

              </table>
            </div>

            {/* Pagination Panel (High Density) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderTop: "1px solid var(--border-color)", background: "#f8fafc", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
              
              {/* Size selection and totals */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)" }}>
                  <span>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                    style={{ padding: "2px", fontSize: "10px", border: "1px solid var(--border-color)", borderRadius: "4px", background: "#ffffff" }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>rows</span>
                </div>
                
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  Showing <strong>{processedRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong>{Math.min(processedRecords.length, currentPage * itemsPerPage)}</strong> of <strong>{processedRecords.length}</strong> queried entries
                </span>
              </div>

              {/* Page navigation */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px",
                    background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "4px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={12} />
                </button>
                
                <span style={{ fontSize: "10px", color: "var(--text-primary)", fontWeight: 600 }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px",
                    background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "4px",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  <ChevronRight size={12} />
                </button>
              </div>

            </div>

          </div>
        </>
      )}

      {/* Bulk actions floating panel */}
      {selectedRows.size > 0 && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--bg-sidebar)",
          color: "#ffffff",
          padding: "8px 20px",
          borderRadius: "30px",
          boxShadow: "var(--shadow-lg), 0 0 15px rgba(192,255,0,0.2)",
          border: "2px solid var(--accent-gold)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 999,
          animation: "slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-title)" }}>
            {selectedRows.size} selected
          </span>
          <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.2)" }} />
          <button
            onClick={() => handleBulkExport("csv")}
            style={{
              background: "rgba(255,255,255,0.12)", border: "none", color: "#ffffff",
              padding: "4px 10px", borderRadius: "15px", fontSize: "10px", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
            }}
            className="bulk-btn"
          >
            <Download size={10} /> CSV
          </button>
          <button
            onClick={() => handleBulkExport("json")}
            style={{
              background: "rgba(255,255,255,0.12)", border: "none", color: "#ffffff",
              padding: "4px 10px", borderRadius: "15px", fontSize: "10px", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
            }}
            className="bulk-btn"
          >
            <Download size={10} /> JSON
          </button>
          <button
            onClick={() => handleBulkExport("geojson")}
            style={{
              background: "rgba(255,255,255,0.12)", border: "none", color: "#ffffff",
              padding: "4px 10px", borderRadius: "15px", fontSize: "10px", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
            }}
            className="bulk-btn"
          >
            <Download size={10} /> GeoJSON
          </button>
          <button
            onClick={() => handleBulkExport("kml")}
            style={{
              background: "rgba(255,255,255,0.12)", border: "none", color: "#ffffff",
              padding: "4px 10px", borderRadius: "15px", fontSize: "10px", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
            }}
            className="bulk-btn"
          >
            <Download size={10} /> KML
          </button>
          <button
            onClick={handleBulkDelete}
            style={{
              background: "var(--accent-rose)", border: "none", color: "#ffffff",
              padding: "4px 10px", borderRadius: "15px", fontSize: "10px", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
            }}
            className="bulk-btn"
          >
            <Trash2 size={10} /> Delete
          </button>
          <button
            onClick={() => setSelectedRows(new Set())}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.6)",
              cursor: "pointer", fontSize: "10px", padding: "2px"
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Modifications History Drawer (Right Slide-out Panel) */}
      {isHistoryPanelOpen && (
        <>
          <div 
            onClick={() => setIsHistoryPanelOpen(false)}
            style={{
              position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
              background: "rgba(11, 34, 20, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 1001
            }}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, width: "450px", height: "100vh",
            background: "#ffffff", boxShadow: "-5px 0 25px rgba(0,0,0,0.15)",
            zIndex: 1002, display: "flex", flexDirection: "column",
            borderLeft: "3px solid var(--accent-green)",
            animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid var(--border-color)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "rgba(0,102,51,0.03)"
            }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 800, fontSize: "15px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <History size={16} style={{ color: "var(--accent-green)" }} /> Change History Log
                </h3>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  Review local overrides for {activeTab === "ldn" ? "Land Cover" : "Soil Core"}
                </span>
              </div>
              <button
                onClick={() => setIsHistoryPanelOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: "16px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              
              {/* Overrides Stats Dashboard */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px",
                padding: "8px 10px", background: "rgba(0,102,51,0.02)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)"
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#10b981" }}>{activeMods.additions.length}</div>
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600 }}>Additions</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-amber)" }}>
                    {Object.keys(activeMods.edits).length + (activeMods.parentEdits ? Object.keys(activeMods.parentEdits).length : 0)}
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600 }}>Modifications</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-rose)" }}>{activeMods.deletions.length}</div>
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600 }}>Deletions</div>
                </div>
              </div>

              {/* History list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {totalModifications === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px 10px", fontSize: "11px" }}>
                    No local changes found. Data is in sync with server cache.
                  </div>
                ) : (
                  <>
                    {/* Additions */}
                    {activeMods.additions.map((add: any) => (
                      <div key={add._id} style={{
                        padding: "8px 10px", background: "rgba(16,185,129,0.04)",
                        border: "1px solid rgba(16,185,129,0.12)", borderRadius: "var(--radius-md)",
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}>
                        <div>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "#10b981" }}>➕ ADDED RECORD</div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>{add.ceid || add["geninfo/ceid"] || `ID: ${add._id}`}</div>
                          <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                            District: {add.dist || add["geninfo/dist"]} • Ward {add.ward || add["geninfo/ward"]}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevert(add._id)}
                          style={{
                            background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
                            display: "flex", alignItems: "center", padding: "4px", borderRadius: "4px", transition: "all 0.2s"
                          }}
                          title="Revert addition"
                          className="revert-btn"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Edits */}
                    {Object.entries(activeMods.edits).map(([key, val]: [string, any]) => {
                      const rec = activeRecords.find(r => String(r._id) === key);
                      const name = rec ? (rec.ceid || rec["sampl/samplid"] || rec["geninfo/ceid"]) : `ID: ${key}`;
                      return (
                        <div key={key} style={{
                          padding: "8px 10px", background: "rgba(217,119,6,0.04)",
                          border: "1px solid rgba(217,119,6,0.12)", borderRadius: "var(--radius-md)",
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <div>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--accent-amber)" }}>✏️ MODIFIED FIELDS</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>{name}</div>
                            <div style={{ fontSize: "8px", color: "var(--text-muted)", wordBreak: "break-all" }}>
                              Keys overrides: {Object.keys(val).join(", ")}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevert(key)}
                            style={{
                              background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
                              display: "flex", alignItems: "center", padding: "4px", borderRadius: "4px", transition: "all 0.2s"
                            }}
                            title="Revert modifications"
                            className="revert-btn"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Soil Parent Edits */}
                    {activeMods.parentEdits && Object.entries(activeMods.parentEdits).map(([key, val]: [string, any]) => {
                      const rec = activeRecords.find(r => String(r._id) === key || String(r._id).startsWith(key + "_"));
                      const name = rec ? (rec.ceid || rec["geninfo/ceid"]) : `ID: ${key}`;
                      return (
                        <div key={key} style={{
                          padding: "8px 10px", background: "rgba(217,119,6,0.04)",
                          border: "1px solid rgba(217,119,6,0.12)", borderRadius: "var(--radius-md)",
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <div>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--accent-amber)" }}>✏️ MODIFIED SITE LEVEL</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>{name}</div>
                            <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                              Modified keys: {Object.keys(val).join(", ")}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevert(key)}
                            style={{
                              background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
                              display: "flex", alignItems: "center", padding: "4px", borderRadius: "4px", transition: "all 0.2s"
                            }}
                            title="Revert site details"
                            className="revert-btn"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Deletions */}
                    {activeMods.deletions.map((delId: string) => (
                      <div key={delId} style={{
                        padding: "8px 10px", background: "rgba(220,38,38,0.04)",
                        border: "1px solid rgba(220,38,38,0.12)", borderRadius: "var(--radius-md)",
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}>
                        <div>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--accent-rose)" }}>❌ DELETED RECORD</div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>ID: {delId}</div>
                          <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Row hidden from table telemetry grids</div>
                        </div>
                        <button
                          onClick={() => handleRevert(delId)}
                          style={{
                            background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
                            display: "flex", alignItems: "center", padding: "4px", borderRadius: "4px", transition: "all 0.2s"
                          }}
                          title="Undo deletion"
                          className="revert-btn"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            {totalModifications > 0 && (
              <div style={{
                padding: "12px 16px", borderTop: "1px solid var(--border-color)",
                background: "#f8fafc", display: "flex", flexDirection: "column", gap: "8px"
              }}>
                <button
                  onClick={handleRevertAll}
                  style={{
                    width: "100%", padding: "8px", fontSize: "11px", fontWeight: 700,
                    background: "var(--accent-rose)", color: "#ffffff", border: "none",
                    borderRadius: "var(--radius-md)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                  }}
                >
                  <RotateCcw size={12} /> Revert All Local Modifications
                </button>
                <div style={{ fontSize: "9px", color: "var(--text-muted)", textAlign: "center" }}>
                  This action clears all custom edits and synchronizes database to live cache.
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {/* Add / Edit Record Modal Dialog */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(11, 34, 20, 0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "20px", animation: "fadeIn 0.2s ease"
        }}>
          <div style={{
            background: "#ffffff", border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "500px",
            maxHeight: "90vh", display: "flex", flexDirection: "column",
            boxShadow: "var(--shadow-lg)"
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid var(--border-color)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 800, fontSize: "14px", color: "var(--text-primary)" }}>
                  {isEditModalOpen ? "✏️ Edit Record Override" : "➕ Add Custom Override Record"}
                </h3>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  Targeting dataset: {activeTab === "ldn" ? "Land Cover" : "Soil Core"}
                </span>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                
                {formError && (
                  <div style={{ padding: "8px", background: "rgba(220,38,38,0.05)", border: "1px solid var(--accent-rose)", borderRadius: "var(--radius-md)", color: "var(--accent-rose)", fontSize: "11px" }}>
                    ⚠️ {formError}
                  </div>
                )}

                {/* Form fields grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  
                  {/* Identifier */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Identifier (ceid)*</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 11626_16623"
                      value={formData.ceid || ""}
                      onChange={(e) => handleFormChange("ceid", e.target.value)}
                      style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none" }}
                    />
                  </div>

                  {/* Surveyor Agent */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Surveyor Agent</label>
                    <input
                      type="text"
                      placeholder="e.g. Angeline Chiri"
                      value={formData.agent || ""}
                      onChange={(e) => handleFormChange("agent", e.target.value)}
                      style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none" }}
                    />
                  </div>

                  {/* District selection */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>District</label>
                    <select
                      value={formData.dist || DISTRICT_LIST[0]}
                      onChange={(e) => handleFormChange("dist", e.target.value)}
                      style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
                    >
                      {DISTRICT_LIST.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ward */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Ward #</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={formData.ward || ""}
                      onChange={(e) => handleFormChange("ward", e.target.value)}
                      style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none" }}
                    />
                  </div>

                  {/* Coordinates: Lat */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Latitude</label>
                    <input
                      type="text"
                      placeholder="e.g. -19.730198"
                      value={formData.lat || ""}
                      onChange={(e) => handleFormChange("lat", e.target.value)}
                      style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none" }}
                    />
                  </div>

                  {/* Coordinates: Lng */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Longitude</label>
                    <input
                      type="text"
                      placeholder="e.g. 32.41075"
                      value={formData.lng || ""}
                      onChange={(e) => handleFormChange("lng", e.target.value)}
                      style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none" }}
                    />
                  </div>

                  {/* LDN Specific Inputs */}
                  {activeTab === "ldn" ? (
                    <>
                      {/* LULC landus */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Land Cover (LULC)</label>
                        <select
                          value={formData.landus || LANDUSE_LIST[0]}
                          onChange={(e) => handleFormChange("landus", e.target.value)}
                          style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
                        >
                          {LANDUSE_LIST.map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>

                      {/* Severity */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Degradation Severity</label>
                        <select
                          value={formData.sev || SEVERITY_LIST[0]}
                          onChange={(e) => handleFormChange("sev", e.target.value)}
                          style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
                        >
                          {SEVERITY_LIST.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Soil Texture */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Soil Texture</label>
                        <select
                          value={formData.tex || SOIL_TEXTURE_LIST[0]}
                          onChange={(e) => handleFormChange("tex", e.target.value)}
                          style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
                        >
                          {SOIL_TEXTURE_LIST.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Sample location (samloc) */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Sampling Location</label>
                        <select
                          value={formData.samloc || "cent"}
                          onChange={(e) => handleFormChange("samloc", e.target.value)}
                          style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
                        >
                          <option value="cent">Center (cent)</option>
                          <option value="north">North</option>
                          <option value="east">East</option>
                          <option value="south">South</option>
                          <option value="west">West</option>
                        </select>
                      </div>

                      {/* Depth */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Sampling Depth (cm)</label>
                        <input
                          type="number"
                          placeholder="e.g. 30"
                          value={formData.dep || "30"}
                          onChange={(e) => handleFormChange("dep", e.target.value)}
                          style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none" }}
                        />
                      </div>

                      {/* Moisture moisture */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>Moisture Present?</label>
                        <select
                          value={formData.moisture || "No"}
                          onChange={(e) => handleFormChange("moisture", e.target.value)}
                          style={{ padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", outline: "none", background: "#ffffff" }}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </>
                  )}

                </div>

              </div>

              {/* Modal Footer actions */}
              <div style={{
                padding: "10px 16px", borderTop: "1px solid var(--border-color)",
                background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "8px",
                borderBottomLeftRadius: "var(--radius-lg)", borderBottomRightRadius: "var(--radius-lg)"
              }}>
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  style={{
                    padding: "6px 12px", fontSize: "11px", fontWeight: 600,
                    background: "#ffffff", border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)", cursor: "pointer", color: "var(--text-primary)"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "6px 12px", fontSize: "11px", fontWeight: 600,
                    background: activeTab === "ldn" ? "var(--accent-green)" : "var(--accent-amber)", 
                    border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", color: "#ffffff",
                    display: "flex", alignItems: "center", gap: "4px"
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={11} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check size={12} /> Save Override
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
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
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid var(--border-color)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 800, fontSize: "14px", color: "var(--text-primary)" }}>
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
            <div style={{ padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              
              {/* Highlight Card */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px",
                padding: "10px", background: "rgba(6, 75, 34, 0.03)",
                border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                  <MapPin size={12} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>District & Ward</div>
                    <strong>{inspectRecord.dist || inspectRecord._mapped_dist || "Unspecified"} (Ward {inspectRecord.ward || "—"})</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                  <Calendar size={12} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>Submission Time</div>
                    <strong>{inspectRecord._submission_time ? new Date(inspectRecord._submission_time).toLocaleString() : "—"}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                  <User size={12} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>Surveyor Agent</div>
                    <strong>{inspectRecord.agent || "—"}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                  <Activity size={12} style={{ color: "var(--text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>Framework Status</div>
                    <div style={{ marginTop: "1px" }}>{getUnccdBadge(inspectRecord)}</div>
                  </div>
                </div>
              </div>

              {/* JSON tree viewer */}
              <div>
                <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Complete Raw Key-Value JSON Schema
                </label>
                <pre style={{
                  padding: "10px", background: "#0f172a", color: "#38bdf8",
                  borderRadius: "var(--radius-md)", fontSize: "10px", overflowX: "auto",
                  fontFamily: "monospace", margin: 0, maxHeight: "250px", lineHeight: "1.4"
                }}>
                  {JSON.stringify(inspectRecord, null, 2)}
                </pre>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "10px 16px", borderTop: "1px solid var(--border-color)",
              background: "#f8fafc", display: "flex", justifyContent: "flex-end",
              borderBottomLeftRadius: "var(--radius-lg)", borderBottomRightRadius: "var(--radius-lg)"
            }}>
              <button
                onClick={() => setInspectRecord(null)}
                style={{
                  padding: "6px 12px", fontSize: "11px", fontWeight: 600,
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
