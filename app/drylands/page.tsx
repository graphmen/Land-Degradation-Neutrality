"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { downloadFile } from "@/lib/export";
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

const DrylandsMapView = dynamic(() => import("@/components/DrylandsMapView"), { ssr: false });

const AREA_TYPES = ["Arable", "Grazing", "Wetland", "Forest/Woodland", "Other"];
const VEG_CONDITIONS = ["Intact", "Moderately Degraded", "Severely Degraded"];
const PRIORITY_LEVELS = ["Low", "Medium", "High (Immediate Action Required)"];
const SOIL_TYPES = ["Jecha (Sandy)", "Red sandy clay", "Very sandy infertile soil", "Clay", "Loamy sand", "Other"];
const EROSION_SEVERITIES = ["None", "Low", "Moderate", "Severe"];
const COST_CATEGORIES = ["Low", "Medium", "High"];

// Helper to convert drylands to CSV
function convertDrylandsToCSV(records: any[]) {
  if (records.length === 0) return "";
  const headers = [
    "ID", "Date of Observation", "Enumerator Name", "Ward Name", "Village Location",
    "Coordinates", "Area Type", "Dominant Soil Type", "Distance to River (m)",
    "Distance to Wetland (m)", "Distance to Road (m)", "Vegetation Condition",
    "Estimated Veg Cover (%)", "Invasive Species Present", "Invasive Species Name",
    "Current Land Cover Types", "Soil Erosion Present", "Types of Erosion",
    "Erosion Severity", "Gully Dimensions", "Erosion Expanding", "Assets Threatened",
    "Water Sources", "Water Quality Visual", "Evidence of Siltation",
    "Wetland Cultivation", "Climate Change Indicators", "Site Flood Prone",
    "Evidence of Recent Fire", "Signs of Drought Stress", "Dominant Livelihoods",
    "Grazing Pressure", "Land Use Conflicts", "Land Use Compatible", "Priority Level",
    "Recommended Interventions", "Cost Category", "Submission Time"
  ];

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) {
      val = val.join("; ");
    }
    let str = String(val).replace(/"/g, '""');
    if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  };

  const headerLine = headers.join(",");
  const rows = records.map(r => [
    r._id,
    r.date_of_observation,
    r.enumerator_name,
    r.ward_name,
    r.village_location,
    r.coordinates,
    Array.isArray(r.area_type) ? r.area_type : [r.area_type],
    r.dominant_soil_type,
    r.distance_to_river,
    r.distance_to_wetland,
    r.distance_to_road,
    r.vegetation_condition,
    r.estimated_vegetation_cover,
    r.invasive_species_present,
    r.invasive_species_name,
    Array.isArray(r.current_land_cover_types) ? r.current_land_cover_types : [r.current_land_cover_types],
    r.soil_erosion_present,
    Array.isArray(r.type_of_erosion) ? r.type_of_erosion : [r.type_of_erosion],
    r.erosion_severity,
    r.gully_dimensions,
    r.erosion_expanding,
    Array.isArray(r.assets_threatened) ? r.assets_threatened : [r.assets_threatened],
    Array.isArray(r.water_sources_present) ? r.water_sources_present : [r.water_sources_present],
    Array.isArray(r.water_quality_visual) ? r.water_quality_visual : [r.water_quality_visual],
    r.evidence_of_siltation,
    r.wetland_cultivation_observed,
    Array.isArray(r.climate_change_indicators) ? r.climate_change_indicators : [r.climate_change_indicators],
    r.site_flood_prone,
    r.evidence_of_recent_fire,
    r.signs_of_drought_stress,
    Array.isArray(r.dominant_livelihoods) ? r.dominant_livelihoods : [r.dominant_livelihoods],
    Array.isArray(r.grazing_pressure) ? r.grazing_pressure : [r.grazing_pressure],
    Array.isArray(r.observed_land_use_conflicts) ? r.observed_land_use_conflicts : [r.observed_land_use_conflicts],
    r.land_use_compatible,
    r.priority_level,
    Array.isArray(r.recommended_interventions) ? r.recommended_interventions : [r.recommended_interventions],
    r.cost_category,
    r._submission_time
  ].map(escapeCell).join(","));

  return [headerLine, ...rows].join("\n");
}

// Helper to convert drylands to GeoJSON
function convertDrylandsToGeoJSON(records: any[]) {
  const features = records.map(r => {
    const coords = (r.coordinates || "").trim().split(/\s+/);
    const lat = parseFloat(coords[0]) || 0;
    const lng = parseFloat(coords[1]) || 0;
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat]
      },
      properties: { ...r }
    };
  });
  return { type: "FeatureCollection", features };
}

// Helper to convert drylands to KML
function convertDrylandsToKML(records: any[], title: string = "Zimbabwe Drylands Export") {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${title}</name>
    <Folder>
      <name>Drylands Observations</name>`;

  for (const r of records) {
    const name = r.village_location ? `${r.village_location} (${r.ward_name})` : "Dryland Obs";
    const coords = (r.coordinates || "").trim().split(/\s+/);
    const lat = parseFloat(coords[0]) || 0;
    const lng = parseFloat(coords[1]) || 0;
    
    let desc = '<table border="1" style="border-collapse:collapse;padding:5px;">';
    desc += `<tr><td><b>Date</b></td><td>${r.date_of_observation}</td></tr>`;
    desc += `<tr><td><b>Enumerator</b></td><td>${r.enumerator_name}</td></tr>`;
    desc += `<tr><td><b>Ward</b></td><td>${r.ward_name}</td></tr>`;
    desc += `<tr><td><b>Village</b></td><td>${r.village_location}</td></tr>`;
    desc += `<tr><td><b>Coordinates</b></td><td>${r.coordinates}</td></tr>`;
    desc += `<tr><td><b>Vegetation Condition</b></td><td>${r.vegetation_condition}</td></tr>`;
    desc += `<tr><td><b>Dominant Soil Type</b></td><td>${r.dominant_soil_type}</td></tr>`;
    desc += `<tr><td><b>Erosion Present?</b></td><td>${r.soil_erosion_present}</td></tr>`;
    desc += `<tr><td><b>Priority Level</b></td><td>${r.priority_level}</td></tr>`;
    desc += `<tr><td><b>Interventions</b></td><td>${Array.isArray(r.recommended_interventions) ? r.recommended_interventions.join("; ") : r.recommended_interventions}</td></tr>`;
    desc += '</table>';

    kml += `
      <Placemark>
        <name>${name}</name>
        <description><![CDATA[${desc}]]></description>
        <Point>
          <coordinates>${lng},${lat},0</coordinates>
        </Point>
      </Placemark>`;
  }

  kml += `
    </Folder>
  </Document>
</kml>`;
  return kml;
}

export default function DrylandsPage() {
  const [viewMode, setViewMode] = useState<"spatial" | "dashboard">("spatial");
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [vegFilter, setVegFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [soilFilter, setSoilFilter] = useState("all");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Editor Form States: "view" | "add" | "edit"
  const [editorMode, setEditorMode] = useState<"view" | "add" | "edit">("view");
  const [formError, setFormError] = useState("");
  const [formTab, setFormTab] = useState<"admin" | "soil" | "veg" | "impact">("admin");
  
  // Form input states
  const [formValues, setFormValues] = useState({
    enumerator_name: "",
    date_of_observation: new Date().toISOString().split("T")[0],
    ward_name: "",
    village_location: "",
    coordinates: "-20.0000 30.0000",
    area_type: [] as string[],
    dominant_soil_type: SOIL_TYPES[0],
    distance_to_river: 0,
    distance_to_wetland: 0,
    distance_to_road: 0,
    vegetation_condition: VEG_CONDITIONS[0],
    estimated_vegetation_cover: 50,
    invasive_species_present: "No",
    invasive_species_name: "",
    current_land_cover_types: [] as string[],
    soil_erosion_present: "No",
    type_of_erosion: [] as string[],
    erosion_severity: EROSION_SEVERITIES[0],
    gully_dimensions: "",
    erosion_expanding: "No",
    assets_threatened: [] as string[],
    water_sources_present: [] as string[],
    water_quality_visual: [] as string[],
    evidence_of_siltation: "No",
    wetland_cultivation_observed: "No",
    water_notes: "",
    climate_change_indicators: [] as string[],
    site_flood_prone: "No",
    flood_notes: "",
    evidence_of_recent_fire: "No",
    fire_notes: "",
    signs_of_drought_stress: "No",
    drought_notes: "",
    dominant_livelihoods: [] as string[],
    livelihood_notes: "",
    grazing_pressure: [] as string[],
    grazing_notes: "",
    observed_land_use_conflicts: [] as string[],
    conflict_notes: "",
    land_use_compatible: "Yes",
    compatibility_explanation: "",
    priority_level: PRIORITY_LEVELS[0],
    priority_explanation: "",
    recommended_interventions: [] as string[],
    intervention_notes: "",
    cost_category: COST_CATEGORIES[0],
    cost_explanation: "",
    additional_notes: ""
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drylands", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setRecords(json.records || []);
        if (json.records?.length > 0) {
          setActiveId(json.records[0]._id);
        }
      }
    } catch (e) {
      console.error("Failed to load drylands data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filter logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        String(r.enumerator_name || "").toLowerCase().includes(searchLower) ||
        String(r.village_location || "").toLowerCase().includes(searchLower) ||
        String(r.ward_name || "").toLowerCase().includes(searchLower);

      const matchVeg = vegFilter === "all" || r.vegetation_condition === vegFilter;
      const matchPriority = priorityFilter === "all" || String(r.priority_level || "").toLowerCase().includes(priorityFilter.toLowerCase());
      const matchSoil = soilFilter === "all" || r.dominant_soil_type === soilFilter;

      return matchSearch && matchVeg && matchPriority && matchSoil;
    });
  }, [records, search, vegFilter, priorityFilter, soilFilter]);

  // Aggregated scorecards
  const totalAssessments = filteredRecords.length;
  const highPriorityPct = totalAssessments > 0
    ? Math.round((filteredRecords.filter(r => String(r.priority_level).toLowerCase().includes("high")).length / totalAssessments) * 100)
    : 0;
  
  const avgVegCover = totalAssessments > 0
    ? Math.round(filteredRecords.reduce((sum, r) => sum + (r.estimated_vegetation_cover || 0), 0) / totalAssessments)
    : 0;

  const erosionPresentPct = totalAssessments > 0
    ? Math.round((filteredRecords.filter(r => String(r.soil_erosion_present).toLowerCase() === "yes").length / totalAssessments) * 100)
    : 0;

  const dashboardStats = useMemo(() => {
    const total = filteredRecords.length;
    const priorityCnt: Record<string, number> = {};
    const vegCnt: Record<string, number> = {};
    const soilCnt: Record<string, number> = {};

    filteredRecords.forEach(r => {
      // Normalize priority level
      let p = "Low";
      const pStr = String(r.priority_level || "").toLowerCase();
      if (pStr.includes("high")) p = "High";
      else if (pStr.includes("medium") || pStr.includes("moderate")) p = "Medium";
      priorityCnt[p] = (priorityCnt[p] || 0) + 1;

      const veg = r.vegetation_condition || "Unknown";
      vegCnt[veg] = (vegCnt[veg] || 0) + 1;

      const soil = r.dominant_soil_type || "Unknown";
      soilCnt[soil] = (soilCnt[soil] || 0) + 1;
    });

    const priorityData = [
      { name: "Low", value: priorityCnt["Low"] || 0, fill: "#10b981" },
      { name: "Medium", value: priorityCnt["Medium"] || 0, fill: "#f59e0b" },
      { name: "High", value: priorityCnt["High"] || 0, fill: "#ef4444" }
    ].filter(item => item.value > 0 || total > 0);

    const vegData = Object.entries(vegCnt).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const soilData = Object.entries(soilCnt).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return {
      total,
      priorityData,
      vegData,
      soilData
    };
  }, [filteredRecords]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ borderTopColor: "var(--accent-gold)" }} />
        <div style={{ color: "#64748b", fontSize: 13 }}>Loading Drylands Hub Framework…</div>
      </div>
    );
  }



  // Pagination (10 per page)
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const currentRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeRecord = records.find(r => r._id === activeId);

  // Toggle checklist values helper
  const toggleCheckbox = (field: keyof typeof formValues, val: string) => {
    const current = (formValues[field] as string[]) || [];
    if (current.includes(val)) {
      setFormValues({ ...formValues, [field]: current.filter(item => item !== val) });
    } else {
      setFormValues({ ...formValues, [field]: [...current, val] });
    }
  };

  // Form submission handler (POST or PUT)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formValues.enumerator_name || !formValues.ward_name || !formValues.village_location || !formValues.coordinates) {
      setFormError("Administrative fields (Enumerator, Ward, Village, Coordinates) are required.");
      return;
    }

    const payload = {
      _id: editorMode === "edit" ? activeId : undefined,
      ...formValues,
      distance_to_river: Number(formValues.distance_to_river) || 0,
      distance_to_wetland: Number(formValues.distance_to_wetland) || 0,
      distance_to_road: Number(formValues.distance_to_road) || 0,
      estimated_vegetation_cover: Number(formValues.estimated_vegetation_cover) || 0,
    };

    try {
      const method = editorMode === "edit" ? "PUT" : "POST";
      const res = await fetch("/api/drylands", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        setEditorMode("view");
        
        // Reload data
        const refreshRes = await fetch("/api/drylands", { cache: "no-store" });
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
      enumerator_name: activeRecord.enumerator_name || "",
      date_of_observation: activeRecord.date_of_observation || new Date().toISOString().split("T")[0],
      ward_name: activeRecord.ward_name || "",
      village_location: activeRecord.village_location || "",
      coordinates: activeRecord.coordinates || "-20.0000 30.0000",
      area_type: activeRecord.area_type || [],
      dominant_soil_type: activeRecord.dominant_soil_type || SOIL_TYPES[0],
      distance_to_river: activeRecord.distance_to_river || 0,
      distance_to_wetland: activeRecord.distance_to_wetland || 0,
      distance_to_road: activeRecord.distance_to_road || 0,
      vegetation_condition: activeRecord.vegetation_condition || VEG_CONDITIONS[0],
      estimated_vegetation_cover: activeRecord.estimated_vegetation_cover || 50,
      invasive_species_present: activeRecord.invasive_species_present || "No",
      invasive_species_name: activeRecord.invasive_species_name || "",
      current_land_cover_types: activeRecord.current_land_cover_types || [],
      soil_erosion_present: activeRecord.soil_erosion_present || "No",
      type_of_erosion: activeRecord.type_of_erosion || [],
      erosion_severity: activeRecord.erosion_severity || EROSION_SEVERITIES[0],
      gully_dimensions: activeRecord.gully_dimensions || "",
      erosion_expanding: activeRecord.erosion_expanding || "No",
      assets_threatened: activeRecord.assets_threatened || [],
      water_sources_present: activeRecord.water_sources_present || [],
      water_quality_visual: activeRecord.water_quality_visual || [],
      evidence_of_siltation: activeRecord.evidence_of_siltation || "No",
      wetland_cultivation_observed: activeRecord.wetland_cultivation_observed || "No",
      water_notes: activeRecord.water_notes || "",
      climate_change_indicators: activeRecord.climate_change_indicators || [],
      site_flood_prone: activeRecord.site_flood_prone || "No",
      flood_notes: activeRecord.flood_notes || "",
      evidence_of_recent_fire: activeRecord.evidence_of_recent_fire || "No",
      fire_notes: activeRecord.fire_notes || "",
      signs_of_drought_stress: activeRecord.signs_of_drought_stress || "No",
      drought_notes: activeRecord.drought_notes || "",
      dominant_livelihoods: activeRecord.dominant_livelihoods || [],
      livelihood_notes: activeRecord.livelihood_notes || "",
      grazing_pressure: activeRecord.grazing_pressure || [],
      grazing_notes: activeRecord.grazing_notes || "",
      observed_land_use_conflicts: activeRecord.observed_land_use_conflicts || [],
      conflict_notes: activeRecord.conflict_notes || "",
      land_use_compatible: activeRecord.land_use_compatible || "Yes",
      compatibility_explanation: activeRecord.compatibility_explanation || "",
      priority_level: activeRecord.priority_level || PRIORITY_LEVELS[0],
      priority_explanation: activeRecord.priority_explanation || "",
      recommended_interventions: activeRecord.recommended_interventions || [],
      intervention_notes: activeRecord.intervention_notes || "",
      cost_category: activeRecord.cost_category || COST_CATEGORIES[0],
      cost_explanation: activeRecord.cost_explanation || "",
      additional_notes: activeRecord.additional_notes || ""
    });
    setFormTab("admin");
    setEditorMode("edit");
    setFormError("");
  };

  const handleAddClick = () => {
    setFormValues({
      enumerator_name: "",
      date_of_observation: new Date().toISOString().split("T")[0],
      ward_name: "",
      village_location: "",
      coordinates: "-20.0000 30.0000",
      area_type: [],
      dominant_soil_type: SOIL_TYPES[0],
      distance_to_river: 0,
      distance_to_wetland: 0,
      distance_to_road: 0,
      vegetation_condition: VEG_CONDITIONS[0],
      estimated_vegetation_cover: 50,
      invasive_species_present: "No",
      invasive_species_name: "",
      current_land_cover_types: [],
      soil_erosion_present: "No",
      type_of_erosion: [],
      erosion_severity: EROSION_SEVERITIES[0],
      gully_dimensions: "",
      erosion_expanding: "No",
      assets_threatened: [],
      water_sources_present: [],
      water_quality_visual: [],
      evidence_of_siltation: "No",
      wetland_cultivation_observed: "No",
      water_notes: "",
      climate_change_indicators: [],
      site_flood_prone: "No",
      flood_notes: "",
      evidence_of_recent_fire: "No",
      fire_notes: "",
      signs_of_drought_stress: "No",
      drought_notes: "",
      dominant_livelihoods: [],
      livelihood_notes: "",
      grazing_pressure: [],
      grazing_notes: "",
      observed_land_use_conflicts: [],
      conflict_notes: "",
      land_use_compatible: "Yes",
      compatibility_explanation: "",
      priority_level: PRIORITY_LEVELS[0],
      priority_explanation: "",
      recommended_interventions: [],
      intervention_notes: "",
      cost_category: COST_CATEGORIES[0],
      cost_explanation: "",
      additional_notes: ""
    });
    setFormTab("admin");
    setEditorMode("add");
    setFormError("");
  };

  const handleDeleteClick = async () => {
    if (!activeId) return;
    if (!confirm("Are you sure you want to delete this dryland observation?")) return;

    try {
      const res = await fetch(`/api/drylands?id=${activeId}`, { method: "DELETE" });
      if (res.ok) {
        const refreshRes = await fetch("/api/drylands", { cache: "no-store" });
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
    const format = (document.getElementById("drylands-export-format") as HTMLSelectElement)?.value || "csv";
    
    if (format === "geojson") {
      const geojsonObj = convertDrylandsToGeoJSON(filteredRecords);
      downloadFile(JSON.stringify(geojsonObj, null, 2), `drylands_export_${Date.now()}.geojson`, "application/json");
    } else if (format === "kml") {
      const kmlStr = convertDrylandsToKML(filteredRecords);
      downloadFile(kmlStr, `drylands_export_${Date.now()}.kml`, "application/vnd.google-earth.kml+xml");
    } else {
      const csvStr = convertDrylandsToCSV(filteredRecords);
      downloadFile(csvStr, `drylands_export_${Date.now()}.csv`, "text/csv;charset=utf-8;");
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    const p = (priority || "").toLowerCase();
    if (p.includes("high")) return "danger-status";
    if (p.includes("medium")) return "warning-status";
    return "active-status"; // low
  };



  const exportPanel = (
    <div className="sidebar-export-panel">
      <div className="sidebar-export-panel-title">Export Dataset</div>
      <div className="sidebar-export-field">
        <label htmlFor="drylands-export-format" className="sidebar-export-label">Format</label>
        <select id="drylands-export-format" className="sidebar-export-select">
          <option value="csv">CSV</option>
          <option value="geojson">GeoJSON</option>
          <option value="kml">KML (Google Earth)</option>
        </select>
      </div>
      <button 
        className="sidebar-export-btn" 
        onClick={handleExport}
        style={{ background: "var(--accent-gold)", color: "#122218" }}
      >
        <span>📥</span> Download Data ({filteredRecords.length})
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
          <span style={{ fontSize: "20px" }}>🏜️</span>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-title)" }}>
              Drylands Monitoring & Vulnerability
            </h1>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
              Assessing Soil Erosion, Land degradation & Desertification in Vulnerable Zones
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
          <div className="panel-title" style={{ color: "var(--accent-gold)", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>🏜️</span> Drylands Hub
            </span>
            <button 
              onClick={handleAddClick} 
              style={{
                background: "var(--accent-gold)",
                color: "#122218",
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
              placeholder="Search enumerator, ward, village..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="quick-filters" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <select
              value={vegFilter}
              onChange={(e) => {
                setVegFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "10px" }}
            >
              <option value="all">Veg Condition</option>
              {VEG_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "10px" }}
            >
              <option value="all">Priority Level</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={soilFilter}
              onChange={(e) => {
                setSoilFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "10px" }}
            >
              <option value="all">Soil Type</option>
              {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="list-scroll">
          {currentRecords.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 11, padding: 20 }}>
              No observations found.
            </div>
          ) : (
            currentRecords.map((r) => {
              const isSelected = activeId === r._id;
              const priorityBadge = getPriorityBadgeClass(r.priority_level);
              
              return (
                <div
                  key={r._id}
                  className={`site-card ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    setActiveId(r._id);
                    setEditorMode("view");
                  }}
                >
                  <div className="site-card-title">{r.village_location || "Unknown Village"}</div>
                  <div className="site-card-subtitle">{r.ward_name} • {r.enumerator_name}</div>
                  <div className="site-card-meta">
                    <span>🌾 Veg: {r.vegetation_condition}</span>
                    <span className={`site-badge ${priorityBadge}`}>
                      {r.priority_level?.split(" ")[0] || "Low"}
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
        <DrylandsMapView records={filteredRecords} activeId={activeId} />
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
          <div className="detail-section-title">Drylands Status Summary</div>
          <div className="snapshot-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Assessments</div>
              <div className="snapshot-val" style={{ color: "var(--accent-gold)" }}>
                {totalAssessments}
              </div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">High Priority</div>
              <div className="snapshot-val" style={{ color: "var(--accent-rose)" }}>
                {highPriorityPct}%
              </div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Avg Veg Cover</div>
              <div className="snapshot-val">{avgVegCover}%</div>
            </div>
            <div className="snapshot-card">
              <div className="snapshot-lbl">Active Erosion</div>
              <div className="snapshot-val" style={{ color: "var(--accent-amber)" }}>
                {erosionPresentPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel Content (Views Details, or Add/Edit forms) */}
        <div className="detail-section" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          
          {editorMode === "view" && activeRecord && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div className="detail-site-name" style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-primary)" }}>
                  {activeRecord.village_location || "Unknown Village"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                  Ward: <strong>{activeRecord.ward_name}</strong> • Enumerator: <strong>{activeRecord.enumerator_name}</strong>
                </div>
                
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <span className={`site-badge ${getPriorityBadgeClass(activeRecord.priority_level)}`}>
                    Priority: {activeRecord.priority_level}
                  </span>
                  <span className="site-badge" style={{ background: "rgba(234,179,8,0.08)", color: "#b45309", border: "1px solid rgba(234,179,8,0.15)" }}>
                    Veg: {activeRecord.vegetation_condition}
                  </span>
                </div>
              </div>

              {/* Collapsible details sections */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: 6, padding: "8px 10px" }}>
                  <strong style={{ fontSize: "10px", color: "var(--accent-green)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    📍 General & Location Info
                  </strong>
                  <div className="detail-item-list" style={{ gap: "4px" }}>
                    <div className="detail-item-row"><span className="detail-item-label">Date of Observation</span><span className="detail-item-value">{activeRecord.date_of_observation}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">GPS Coordinates</span><span className="detail-item-value">{activeRecord.coordinates}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Area Type</span><span className="detail-item-value">{Array.isArray(activeRecord.area_type) ? activeRecord.area_type.join(", ") : (activeRecord.area_type || "—")}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Dominant Soil Type</span><span className="detail-item-value">{activeRecord.dominant_soil_type}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Distance to River</span><span className="detail-item-value">{activeRecord.distance_to_river}m</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Distance to Wetland</span><span className="detail-item-value">{activeRecord.distance_to_wetland}m</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Distance to Road</span><span className="detail-item-value">{activeRecord.distance_to_road}m</span></div>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: 6, padding: "8px 10px" }}>
                  <strong style={{ fontSize: "10px", color: "var(--accent-green)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    🌿 Vegetation & Land Cover
                  </strong>
                  <div className="detail-item-list" style={{ gap: "4px" }}>
                    <div className="detail-item-row"><span className="detail-item-label">Veg Condition</span><span className="detail-item-value">{activeRecord.vegetation_condition}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Estimated Veg Cover</span><span className="detail-item-value">{activeRecord.estimated_vegetation_cover}%</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Invasive Species</span><span className="detail-item-value">{activeRecord.invasive_species_present === "Yes" ? activeRecord.invasive_species_name : "No"}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Land Cover Types</span><span className="detail-item-value">{Array.isArray(activeRecord.current_land_cover_types) ? activeRecord.current_land_cover_types.join(", ") : (activeRecord.current_land_cover_types || "—")}</span></div>
                  </div>
                  {activeRecord.vegetation_description && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                      "{activeRecord.vegetation_description}"
                    </div>
                  )}
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: 6, padding: "8px 10px" }}>
                  <strong style={{ fontSize: "10px", color: "var(--accent-green)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    💧 Water Sources & Siltation
                  </strong>
                  <div className="detail-item-list" style={{ gap: "4px" }}>
                    <div className="detail-item-row"><span className="detail-item-label">Water Sources</span><span className="detail-item-value">{Array.isArray(activeRecord.water_sources_present) ? activeRecord.water_sources_present.join(", ") : (activeRecord.water_sources_present || "—")}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Water Quality Visual</span><span className="detail-item-value">{Array.isArray(activeRecord.water_quality_visual) ? activeRecord.water_quality_visual.join(", ") : (activeRecord.water_quality_visual || "—")}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Evidence of Siltation</span><span className="detail-item-value">{activeRecord.evidence_of_siltation}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Wetland Cultivation</span><span className="detail-item-value">{activeRecord.wetland_cultivation_observed}</span></div>
                  </div>
                  {activeRecord.water_notes && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                      "{activeRecord.water_notes}"
                    </div>
                  )}
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: 6, padding: "8px 10px" }}>
                  <strong style={{ fontSize: "10px", color: "var(--accent-green)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    ⛰️ Soil Erosion & Hazards
                  </strong>
                  <div className="detail-item-list" style={{ gap: "4px" }}>
                    <div className="detail-item-row"><span className="detail-item-label">Soil Erosion Present?</span><span className="detail-item-value">{activeRecord.soil_erosion_present}</span></div>
                    {activeRecord.soil_erosion_present === "Yes" && (
                      <>
                        <div className="detail-item-row"><span className="detail-item-label">Erosion Types</span><span className="detail-item-value">{Array.isArray(activeRecord.type_of_erosion) ? activeRecord.type_of_erosion.join(", ") : (activeRecord.type_of_erosion || "—")}</span></div>
                        <div className="detail-item-row"><span className="detail-item-label">Erosion Severity</span><span className="detail-item-value">{activeRecord.erosion_severity}</span></div>
                        <div className="detail-item-row"><span className="detail-item-label">Gully Dimensions</span><span className="detail-item-value">{activeRecord.gully_dimensions || "—"}</span></div>
                        <div className="detail-item-row"><span className="detail-item-label">Erosion Expanding?</span><span className="detail-item-value">{activeRecord.erosion_expanding}</span></div>
                        <div className="detail-item-row"><span className="detail-item-label">Assets Threatened</span><span className="detail-item-value">{Array.isArray(activeRecord.assets_threatened) ? activeRecord.assets_threatened.join(", ") : (activeRecord.assets_threatened || "—")}</span></div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: 6, padding: "8px 10px" }}>
                  <strong style={{ fontSize: "10px", color: "var(--accent-green)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    🔥 Climate & Livelihoods Stress
                  </strong>
                  <div className="detail-item-list" style={{ gap: "4px" }}>
                    <div className="detail-item-row"><span className="detail-item-label">Climate Indicators</span><span className="detail-item-value">{Array.isArray(activeRecord.climate_change_indicators) ? activeRecord.climate_change_indicators.join(", ") : (activeRecord.climate_change_indicators || "—")}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Site Flood Prone?</span><span className="detail-item-value">{activeRecord.site_flood_prone}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Recent Veld Fire?</span><span className="detail-item-value">{activeRecord.evidence_of_recent_fire}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Drought Stress?</span><span className="detail-item-value">{activeRecord.signs_of_drought_stress}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Dominant Livelihoods</span><span className="detail-item-value">{Array.isArray(activeRecord.dominant_livelihoods) ? activeRecord.dominant_livelihoods.join(", ") : (activeRecord.dominant_livelihoods || "—")}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Grazing Pressure</span><span className="detail-item-value">{Array.isArray(activeRecord.grazing_pressure) ? activeRecord.grazing_pressure.join(", ") : (activeRecord.grazing_pressure || "—")}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Land Conflicts</span><span className="detail-item-value">{Array.isArray(activeRecord.observed_land_use_conflicts) ? activeRecord.observed_land_use_conflicts.join(", ") : (activeRecord.observed_land_use_conflicts || "—")}</span></div>
                    <div className="detail-item-row"><span className="detail-item-label">Land Use Compatible?</span><span className="detail-item-value">{activeRecord.land_use_compatible}</span></div>
                  </div>
                  {activeRecord.compatibility_explanation && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, borderTop: "1px solid #eee", paddingTop: 4 }}>
                      <strong>Compatibility Explanation:</strong> {activeRecord.compatibility_explanation}
                    </div>
                  )}
                </div>

                <div style={{ background: "rgba(0,102,51,0.03)", border: "1px solid rgba(0,102,51,0.15)", borderRadius: 6, padding: "8px 10px" }}>
                  <strong style={{ fontSize: "10px", color: "var(--accent-green)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    🛠️ Recommended Interventions
                  </strong>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#006633", marginBottom: 4 }}>
                    {Array.isArray(activeRecord.recommended_interventions) ? activeRecord.recommended_interventions.join(", ") : (activeRecord.recommended_interventions || "None")}
                  </div>
                  {activeRecord.intervention_notes && (
                    <div style={{ fontSize: 10, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>
                      {activeRecord.intervention_notes}
                    </div>
                  )}
                  <div className="detail-item-list" style={{ gap: "4px" }}>
                    <div className="detail-item-row"><span className="detail-item-label">Cost Category</span><span className="detail-item-value" style={{ fontWeight: 700 }}>{activeRecord.cost_category}</span></div>
                    {activeRecord.cost_explanation && <div style={{ fontSize: 9, color: "var(--text-muted)", fontStyle: "italic" }}>Cost Info: {activeRecord.cost_explanation}</div>}
                  </div>
                </div>
              </div>

              {/* Editing & Deleting Actions */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button 
                  onClick={handleEditClick}
                  className="sidebar-export-btn"
                  style={{ flex: 1, padding: "8px", fontSize: "11px", background: "var(--accent-blue)", color: "#fff" }}
                >
                  Edit details
                </button>
                <button 
                  onClick={handleDeleteClick}
                  className="action-btn-danger"
                  style={{ flex: 1, padding: "8px", fontSize: "11px", margin: 0 }}
                >
                  Delete Record
                </button>
              </div>
            </div>
          )}

          {editorMode === "view" && !activeRecord && (
            <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", padding: 20 }}>
              No observation selected. Select one from the list or click "+ Add New" to register a dryland record.
            </div>
          )}

          {/* Form Editor Panel (Create & Update) */}
          {(editorMode === "add" || editorMode === "edit") && (
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-green)", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                {editorMode === "add" ? "📝 New Dryland Assessment" : "✏️ Edit Assessment Details"}
              </div>

              {formError && (
                <div style={{ padding: "6px 8px", background: "#fef2f2", color: "#b91c1c", fontSize: "10px", borderRadius: "var(--radius-sm)", border: "1px solid #fee2e2" }}>
                  ⚠️ {formError}
                </div>
              )}

              {/* Form Tabs Navigation */}
              <div className="quick-filters" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", marginBottom: "8px" }}>
                <button type="button" onClick={() => setFormTab("admin")} style={{ fontSize: "9px", padding: "4px", background: formTab === "admin" ? "var(--accent-gold)" : "#eee", color: formTab === "admin" ? "#122218" : "#333", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: formTab === "admin" ? "bold" : "normal" }}>Admin</button>
                <button type="button" onClick={() => setFormTab("soil")} style={{ fontSize: "9px", padding: "4px", background: formTab === "soil" ? "var(--accent-gold)" : "#eee", color: formTab === "soil" ? "#122218" : "#333", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: formTab === "soil" ? "bold" : "normal" }}>Soil & Water</button>
                <button type="button" onClick={() => setFormTab("veg")} style={{ fontSize: "9px", padding: "4px", background: formTab === "veg" ? "var(--accent-gold)" : "#eee", color: formTab === "veg" ? "#122218" : "#333", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: formTab === "veg" ? "bold" : "normal" }}>Veg & Cover</button>
                <button type="button" onClick={() => setFormTab("impact")} style={{ fontSize: "9px", padding: "4px", background: formTab === "impact" ? "var(--accent-gold)" : "#eee", color: formTab === "impact" ? "#122218" : "#333", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: formTab === "impact" ? "bold" : "normal" }}>Intervention</button>
              </div>

              <div style={{ maxHeight: "350px", overflowY: "auto", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "10px" }}>
                
                {/* TAB 1: ADMIN INFO */}
                {formTab === "admin" && (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Enumerator Name</label>
                      <input 
                        type="text" 
                        value={formValues.enumerator_name}
                        onChange={(e) => setFormValues({ ...formValues, enumerator_name: e.target.value })}
                        style={{ width: "100%", padding: "6px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                        placeholder="Enumerator name"
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Date of Observation</label>
                        <input 
                          type="date" 
                          value={formValues.date_of_observation}
                          onChange={(e) => setFormValues({ ...formValues, date_of_observation: e.target.value })}
                          style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Ward Name</label>
                        <input 
                          type="text" 
                          value={formValues.ward_name}
                          onChange={(e) => setFormValues({ ...formValues, ward_name: e.target.value })}
                          style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                          placeholder="e.g. Ward 4"
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Village Location</label>
                        <input 
                          type="text" 
                          value={formValues.village_location}
                          onChange={(e) => setFormValues({ ...formValues, village_location: e.target.value })}
                          style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                          placeholder="e.g. Musikavanhu"
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>GPS Coordinates (Lat Lng)</label>
                        <input 
                          type="text" 
                          value={formValues.coordinates}
                          onChange={(e) => setFormValues({ ...formValues, coordinates: e.target.value })}
                          style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                          placeholder="e.g. -20.320 30.485"
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Area Type</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {AREA_TYPES.map(at => (
                          <label key={at} style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="checkbox" checked={formValues.area_type.includes(at)} onChange={() => toggleCheckbox("area_type", at)} />
                            {at}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* TAB 2: SOIL & WATER */}
                {formTab === "soil" && (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Dominant Soil Type</label>
                      <select 
                        value={formValues.dominant_soil_type}
                        onChange={(e) => setFormValues({ ...formValues, dominant_soil_type: e.target.value })}
                        style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}
                      >
                        {SOIL_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Dist to River (m)</label>
                        <input type="number" value={formValues.distance_to_river} onChange={(e) => setFormValues({ ...formValues, distance_to_river: Number(e.target.value) })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Dist to Wetland</label>
                        <input type="number" value={formValues.distance_to_wetland} onChange={(e) => setFormValues({ ...formValues, distance_to_wetland: Number(e.target.value) })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Dist to Road</label>
                        <input type="number" value={formValues.distance_to_road} onChange={(e) => setFormValues({ ...formValues, distance_to_road: Number(e.target.value) })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Water Sources Present</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {["Borehole", "River", "Wetland", "Stream", "Seasonal water point"].map(ws => (
                          <label key={ws} style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="checkbox" checked={formValues.water_sources_present.includes(ws)} onChange={() => toggleCheckbox("water_sources_present", ws)} />
                            {ws}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Water Quality Visual</label>
                        {["Clear", "Slightly Turbid", "Highly Silted"].map(wq => (
                          <label key={wq} style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                            <input type="checkbox" checked={formValues.water_quality_visual.includes(wq)} onChange={() => toggleCheckbox("water_quality_visual", wq)} />
                            {wq}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="checkbox" checked={formValues.evidence_of_siltation === "Yes"} onChange={(e) => setFormValues({ ...formValues, evidence_of_siltation: e.target.checked ? "Yes" : "No" })} />
                          Evidence of Siltation?
                        </label>
                        <label style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="checkbox" checked={formValues.wetland_cultivation_observed === "Yes"} onChange={(e) => setFormValues({ ...formValues, wetland_cultivation_observed: e.target.checked ? "Yes" : "No" })} />
                          Wetland Cultivation?
                        </label>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Water & Siltation Notes</label>
                      <textarea value={formValues.water_notes} onChange={(e) => setFormValues({ ...formValues, water_notes: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", height: "40px" }} />
                    </div>
                  </>
                )}

                {/* TAB 3: VEGETATION & LAND COVER */}
                {formTab === "veg" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Vegetation Condition</label>
                        <select 
                          value={formValues.vegetation_condition}
                          onChange={(e) => setFormValues({ ...formValues, vegetation_condition: e.target.value })}
                          style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}
                        >
                          {VEG_CONDITIONS.map(vc => <option key={vc} value={vc}>{vc}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Estimated Cover (%)</label>
                        <input type="number" min="0" max="100" value={formValues.estimated_vegetation_cover} onChange={(e) => setFormValues({ ...formValues, estimated_vegetation_cover: Number(e.target.value) })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Invasive Species Present?</label>
                        <select value={formValues.invasive_species_present} onChange={(e) => setFormValues({ ...formValues, invasive_species_present: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      {formValues.invasive_species_present === "Yes" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Invasive Species Name</label>
                          <input type="text" value={formValues.invasive_species_name} onChange={(e) => setFormValues({ ...formValues, invasive_species_name: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }} placeholder="e.g. Lantana Camara" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Current Land Cover Types</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {["Cropland", "Grassland", "Woodland", "Bare Land", "Wetland Vegetation"].map(lc => (
                          <label key={lc} style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="checkbox" checked={formValues.current_land_cover_types.includes(lc)} onChange={() => toggleCheckbox("current_land_cover_types", lc)} />
                            {lc}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Soil Erosion Present?</label>
                      <select value={formValues.soil_erosion_present} onChange={(e) => setFormValues({ ...formValues, soil_erosion_present: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    {formValues.soil_erosion_present === "Yes" && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div>
                            <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Types of Erosion</label>
                            {["Sheet", "Rill", "Gully"].map(et => (
                              <label key={et} style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                <input type="checkbox" checked={formValues.type_of_erosion.includes(et)} onChange={() => toggleCheckbox("type_of_erosion", et)} />
                                {et}
                              </label>
                            ))}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Erosion Severity</label>
                            <select value={formValues.erosion_severity} onChange={(e) => setFormValues({ ...formValues, erosion_severity: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}>
                              {EROSION_SEVERITIES.map(es => <option key={es} value={es}>{es}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Gully Dimensions</label>
                            <input type="text" value={formValues.gully_dimensions} onChange={(e) => setFormValues({ ...formValues, gully_dimensions: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }} placeholder="e.g. L: 10m W: 2m" />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Erosion Expanding?</label>
                            <select value={formValues.erosion_expanding} onChange={(e) => setFormValues({ ...formValues, erosion_expanding: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}>
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* TAB 4: IMPACT & INTERVENTIONS */}
                {formTab === "impact" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Priority Level</label>
                        <select 
                          value={formValues.priority_level}
                          onChange={(e) => setFormValues({ ...formValues, priority_level: e.target.value })}
                          style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}
                        >
                          {PRIORITY_LEVELS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Cost Category</label>
                        <select 
                          value={formValues.cost_category}
                          onChange={(e) => setFormValues({ ...formValues, cost_category: e.target.value })}
                          style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}
                        >
                          {COST_CATEGORIES.map(cc => <option key={cc} value={cc}>{cc}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Priority Explanation</label>
                      <input type="text" value={formValues.priority_explanation} onChange={(e) => setFormValues({ ...formValues, priority_explanation: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }} placeholder="e.g. Gully expansion threatens cropland" />
                    </div>
                    <div>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Recommended Interventions</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {["Vetiver planting", "Contour ridges", "Stone pitching", "Gabions", "Buffer demarcation", "Controlled grazing"].map(ri => (
                          <label key={ri} style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="checkbox" checked={formValues.recommended_interventions.includes(ri)} onChange={() => toggleCheckbox("recommended_interventions", ri)} />
                            {ri}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Intervention Notes</label>
                      <textarea value={formValues.intervention_notes} onChange={(e) => setFormValues({ ...formValues, intervention_notes: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", height: "40px" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="checkbox" checked={formValues.site_flood_prone === "Yes"} onChange={(e) => setFormValues({ ...formValues, site_flood_prone: e.target.checked ? "Yes" : "No" })} />
                          Site Flood Prone?
                        </label>
                        <label style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="checkbox" checked={formValues.evidence_of_recent_fire === "Yes"} onChange={(e) => setFormValues({ ...formValues, evidence_of_recent_fire: e.target.checked ? "Yes" : "No" })} />
                          Recent Veld Fire?
                        </label>
                        <label style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="checkbox" checked={formValues.signs_of_drought_stress === "Yes"} onChange={(e) => setFormValues({ ...formValues, signs_of_drought_stress: e.target.checked ? "Yes" : "No" })} />
                          Signs of Drought?
                        </label>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)" }}>Land Use Compatible?</label>
                        <select value={formValues.land_use_compatible} onChange={(e) => setFormValues({ ...formValues, land_use_compatible: e.target.value })} style={{ padding: "5px", fontSize: "11px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "#fff" }}>
                          <option value="Yes">Yes</option>
                          <option value="Partially">Partially</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button 
                  type="submit"
                  className="sidebar-export-btn"
                  style={{ flex: 2, padding: "8px", fontSize: "11px", background: "var(--accent-gold)", color: "#122218", fontWeight: "700" }}
                >
                  Save Assessment
                </button>
                <button 
                  type="button"
                  onClick={() => setEditorMode("view")}
                  className="action-btn-danger"
                  style={{ flex: 1, padding: "8px", fontSize: "11px", margin: 0, background: "#e2e8f0", color: "#475569", borderColor: "#cbd5e1" }}
                >
                  Cancel
                </button>
              </div>
            </form>
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
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Assessments Conducted</span>
                <span style={{ fontSize: "20px" }}>🏜️</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{dashboardStats?.total}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Active filtered dryland records</div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "16px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Avg Vegetation Cover</span>
                <span style={{ fontSize: "20px" }}>🌱</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{avgVegCover}%</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Average estimated cover percentage</div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "16px", boxShadow: "var(--shadow-sm)", borderLeft: "4px solid var(--accent-rose)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--accent-rose)" }}>High Priority Area Pct</span>
                <span style={{ fontSize: "20px" }}>🚨</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--accent-rose)" }}>{highPriorityPct}%</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Assessments requiring immediate intervention</div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "16px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Active Erosion Pct</span>
                <span style={{ fontSize: "20px" }}>⚠️</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{erosionPresentPct}%</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>Sites with confirmed active soil erosion</div>
            </div>
          </div>

          {/* Recharts Graphs Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "20px"
          }}>
            {/* Chart 1: Priority Levels */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Intervention Priority Levels
              </h3>
              {dashboardStats?.priorityData && dashboardStats.priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dashboardStats.priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {dashboardStats.priorityData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Sites`, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px" }}>No data to display</div>
              )}
            </div>

            {/* Chart 2: Vegetation conditions */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Vegetation Condition Profile
              </h3>
              {dashboardStats?.vegData && dashboardStats.vegData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dashboardStats.vegData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(value) => [`${value} Sites`, "Count"]} />
                    <Bar dataKey="value" name="Sites" radius={[4, 4, 0, 0]}>
                      {dashboardStats.vegData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={["#10b981", "#f59e0b", "#ef4444", "#3b82f6"][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px" }}>No data to display</div>
              )}
            </div>

            {/* Chart 3: Dominant soil types */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)", gridColumn: "span 3" }}>
              <h3 style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Dominant Soil Type Distribution
              </h3>
              {dashboardStats?.soilData && dashboardStats.soilData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dashboardStats.soilData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(value) => [`${value} Sites`, "Count"]} />
                    <Bar dataKey="value" name="Sites" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px" }}>No data to display</div>
              )}
            </div>
          </div>
        </div>
      )}
      {mounted && createPortal(exportPanel, document.getElementById("sidebar-export-container")!)}
    </div>
  );
}
