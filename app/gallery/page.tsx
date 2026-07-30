"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, MapPin, Calendar, User, Eye, ShieldAlert, Sparkles, Filter, RefreshCw, Maximize2 } from "lucide-react";

interface GalleryItem {
  id: string | number;
  ceid?: string;
  district: string;
  ward: string;
  team: string;
  landuse: string;
  severity: string;
  vegCover?: string;
  erosionSigns?: string;
  dateStr: string;
  lat?: number;
  lng?: number;
  photoUrl: string;
  thumbUrl: string;
  rawRecord: any;
}

function extractPhotos(records: any[]): GalleryItem[] {
  const items: GalleryItem[] = [];

  for (const r of records) {
    const raw = (r.raw_data && typeof r.raw_data === "object") ? r.raw_data : {};
    const atts = raw._attachments || r._attachments || [];

    // Find photo attachment
    let photoUrl = "";
    let thumbUrl = "";

    if (Array.isArray(atts) && atts.length > 0) {
      const imgAtt = atts.find((a: any) => a.mimetype?.startsWith("image/") || a.download_url?.includes("attachments"));
      if (imgAtt) {
        photoUrl = imgAtt.download_large_url || imgAtt.download_medium_url || imgAtt.download_url || "";
        thumbUrl = imgAtt.download_small_url || imgAtt.download_medium_url || imgAtt.download_url || "";
      }
    }

    if (!photoUrl && (raw.im || r.im || raw.photo || r.photo)) {
      const photoName = raw.im || r.im || raw.photo || r.photo;
      // Search for attachment matching basename
      const match = atts.find((a: any) => a.filename?.includes(photoName) || a.media_file_basename === photoName);
      if (match) {
        photoUrl = match.download_large_url || match.download_medium_url || match.download_url || "";
        thumbUrl = match.download_small_url || match.download_medium_url || match.download_url || "";
      }
    }

    if (photoUrl) {
      const dist = r.dist || r.district || raw["geninfo/dist"] || "Unknown District";
      const ward = r.ward || raw["geninfo/ward"] || "—";
      const team = r.team || r.agent || raw["geninfo/team"] || "Survey Team";
      const landuse = r.landus || r.land_use || r.land_cover || raw["ldi/tree"] || "Land Cover";
      const severity = r.sev || r.severity || raw["ldi/sev"] || "Unrated";
      const dateStr = r.submission_time || r._submission_time || r.created_at || raw.today || "";
      const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Field Record";

      items.push({
        id: r._id || r.id || r.kobo_id || Math.random().toString(),
        ceid: r.ceid || raw.ceid,
        district: dist,
        ward: String(ward).startsWith("Ward") ? String(ward) : `Ward ${ward}`,
        team: String(team),
        landuse: String(landuse),
        severity: String(severity),
        vegCover: r.veg_cover || raw["ldi/veg_cov"],
        erosionSigns: r.erosion_signs || raw.oth,
        dateStr: formattedDate,
        lat: r.lat,
        lng: r.lng,
        photoUrl,
        thumbUrl,
        rawRecord: r
      });
    }
  }

  return items;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [landuseFilter, setLanduseFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  // Lightbox modal state
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);

  useEffect(() => {
    async function loadGalleryData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ldn?limit=5000", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load LDN telemetry data");
        const json = await res.json();
        const extracted = extractPhotos(json.records || []);
        setItems(extracted);
      } catch (e: any) {
        setError(e.message || "Failed to load field gallery photos");
      } finally {
        setLoading(false);
      }
    }

    loadGalleryData();
  }, []);

  // Filter dropdown options
  const filterOptions = useMemo(() => {
    const districts = new Set<string>();
    const landuses = new Set<string>();
    const severities = new Set<string>();

    items.forEach(item => {
      if (item.district && item.district !== "Unknown District") districts.add(item.district);
      if (item.landuse) landuses.add(item.landuse);
      if (item.severity) severities.add(item.severity);
    });

    return {
      districts: Array.from(districts).sort(),
      landuses: Array.from(landuses).sort(),
      severities: Array.from(severities).sort()
    };
  }, [items]);

  // Filtered gallery items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        item.district.toLowerCase().includes(searchLower) ||
        item.ward.toLowerCase().includes(searchLower) ||
        item.team.toLowerCase().includes(searchLower) ||
        item.landuse.toLowerCase().includes(searchLower) ||
        item.severity.toLowerCase().includes(searchLower) ||
        (item.ceid && item.ceid.toLowerCase().includes(searchLower));

      const matchDistrict = districtFilter === "all" || item.district === districtFilter;
      const matchLanduse = landuseFilter === "all" || item.landuse === landuseFilter;
      
      const sLower = item.severity.toLowerCase();
      let matchSeverity = severityFilter === "all";
      if (severityFilter === "hotspot") {
        matchSeverity = sLower.includes("high") || sLower.includes("severe") || sLower.includes("critical");
      } else if (severityFilter === "brightspot") {
        matchSeverity = sLower.includes("low") || sLower.includes("minimal") || sLower.includes("stable") || sLower.includes("none");
      } else if (severityFilter === "moderate") {
        matchSeverity = sLower.includes("mod") || sLower.includes("med");
      }

      return matchSearch && matchDistrict && matchLanduse && matchSeverity;
    });
  }, [items, search, districtFilter, landuseFilter, severityFilter]);

  const getBadgeStyle = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes("high") || s.includes("severe") || s.includes("critical")) {
      return { bg: "rgba(225,29,72,0.12)", color: "#e11d48", label: "Hotspot ⚠️", border: "1px solid rgba(225,29,72,0.3)" };
    }
    if (s.includes("low") || s.includes("minimal") || s.includes("stable") || s.includes("none")) {
      return { bg: "rgba(16,185,129,0.12)", color: "#10b981", label: "Bright Spot 🌟", border: "1px solid rgba(16,185,129,0.3)" };
    }
    return { bg: "rgba(245,158,11,0.12)", color: "#d97706", label: "Moderate 🟡", border: "1px solid rgba(245,158,11,0.3)" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", overflow: "hidden", background: "#f8fafc" }}>
      
      {/* Top Header Banner */}
      <div style={{
        padding: "16px 24px",
        background: "#ffffff",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "rgba(5, 150, 105, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px"
          }}>
            🖼️
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-title)" }}>
              Field Telemetry Photo Gallery
            </h1>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
              High-Resolution Ground Observation Imagery Captured Across Zimbabwe Monitored Landscapes
            </p>
          </div>
        </div>

        {/* Counter Stats Pill */}
        <div style={{
          display: "flex",
          gap: "16px",
          background: "#f1f5f9",
          padding: "8px 16px",
          borderRadius: "9999px",
          border: "1px solid #e2e8f0",
          fontSize: "11px",
          fontWeight: 600
        }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Total Photos: </span>
            <span style={{ color: "var(--text-green)", fontWeight: 800 }}>{items.length}</span>
          </div>
          <div style={{ width: "1px", background: "#cbd5e1" }} />
          <div>
            <span style={{ color: "var(--text-muted)" }}>Displaying: </span>
            <span style={{ color: "#0284c7", fontWeight: 800 }}>{filteredItems.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        padding: "12px 24px",
        background: "#ffffff",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
        alignItems: "center",
        flexShrink: 0
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search by District, Ward, Team, Land Cover..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 32px",
              fontSize: "12px",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              outline: "none",
              background: "#f8fafc"
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* District Filter */}
        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", outline: "none", background: "#ffffff" }}
        >
          <option value="all">All Districts</option>
          {filterOptions.districts.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Land Cover Filter */}
        <select
          value={landuseFilter}
          onChange={(e) => setLanduseFilter(e.target.value)}
          style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", outline: "none", background: "#ffffff" }}
        >
          <option value="all">All Land Covers</option>
          {filterOptions.landuses.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", outline: "none", background: "#ffffff" }}
        >
          <option value="all">All Degradation Statuses</option>
          <option value="hotspot">Degraded Hotspots ⚠️</option>
          <option value="moderate">Moderate Degradation 🟡</option>
          <option value="brightspot">Restored Bright Spots 🌟</option>
        </select>
      </div>

      {/* Main Gallery Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "12px" }}>
            <div className="spinner" style={{ borderTopColor: "var(--accent-green)" }} />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Loading field imagery...</span>
          </div>
        ) : error ? (
          <div style={{ padding: "24px", background: "rgba(225,29,72,0.05)", border: "1px solid #e11d48", borderRadius: "12px", color: "#e11d48", textAlign: "center" }}>
            <h3>⚠️ Error Loading Gallery</h3>
            <p>{error}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#334155" }}>No Field Photos Match Your Filter</h3>
            <p style={{ fontSize: "12px", margin: "6px 0 0" }}>Try adjusting your search criteria or filter dropdowns above.</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px"
          }}>
            {filteredItems.map(item => {
              const badge = getBadgeStyle(item.severity);
              const proxyUrl = `/api/media?url=${encodeURIComponent(item.thumbUrl || item.photoUrl)}`;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedPhoto(item)}
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid var(--border-color)",
                    overflow: "hidden",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column"
                  }}
                  className="hover-card"
                >
                  {/* Photo Container */}
                  <div style={{ position: "relative", width: "100%", height: "180px", background: "#0f172a", overflow: "hidden" }}>
                    <img
                      src={proxyUrl}
                      alt={item.landuse}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s ease"
                      }}
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    
                    {/* Status Badge Overlay */}
                    <div style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: badge.bg,
                      color: badge.color,
                      border: badge.border,
                      padding: "3px 8px",
                      borderRadius: "9999px",
                      fontSize: "10px",
                      fontWeight: 700,
                      backdropFilter: "blur(4px)"
                    }}>
                      {badge.label}
                    </div>

                    {/* Expand Hover Hint */}
                    <div style={{
                      position: "absolute",
                      bottom: "8px",
                      right: "8px",
                      background: "rgba(0,0,0,0.6)",
                      color: "#ffffff",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <Maximize2 size={10} /> Inspect
                    </div>
                  </div>

                  {/* Card Content Details */}
                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>
                        {item.district}
                      </h3>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
                        {item.ward}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                      <span>🌳</span>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{item.landuse}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px", borderTop: "1px dashed #e2e8f0", fontSize: "10px", color: "#94a3b8" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <User size={10} /> {item.team}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={10} /> {item.dateStr}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }} onClick={() => setSelectedPhoto(null)}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            maxWidth: "900px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "row",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Left Image View */}
            <div style={{ flex: "1 1 60%", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <img
                src={`/api/media?url=${encodeURIComponent(selectedPhoto.photoUrl)}`}
                alt={selectedPhoto.landuse}
                style={{ width: "100%", height: "100%", maxHeight: "80vh", objectFit: "contain" }}
              />
            </div>

            {/* Right Details Panel */}
            <div style={{ flex: "1 1 40%", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", overflowY: "auto" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                      {selectedPhoto.district}
                    </h2>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                      {selectedPhoto.ward}
                    </span>
                  </div>
                  <button onClick={() => setSelectedPhoto(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
                  <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>Land Cover / Use</div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedPhoto.landuse}</div>
                  </div>

                  <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>Degradation Severity</div>
                    <div style={{ fontWeight: 700, color: "#e11d48" }}>{selectedPhoto.severity}</div>
                  </div>

                  {selectedPhoto.vegCover && (
                    <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>Vegetation Cover</div>
                      <div style={{ fontWeight: 600, color: "#334155" }}>{selectedPhoto.vegCover}</div>
                    </div>
                  )}

                  {selectedPhoto.erosionSigns && (
                    <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>Erosion Signs / Field Notes</div>
                      <div style={{ fontWeight: 600, color: "#334155" }}>{selectedPhoto.erosionSigns}</div>
                    </div>
                  )}

                  <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>Survey Team & Date</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>{selectedPhoto.team} • {selectedPhoto.dateStr}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ paddingTop: "16px", borderTop: "1px solid #e2e8f0", marginTop: "16px" }}>
                <Link
                  href="/ldn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    width: "100%",
                    padding: "10px",
                    background: "var(--accent-green)",
                    color: "#ffffff",
                    borderRadius: "8px",
                    fontWeight: 700,
                    textDecoration: "none",
                    fontSize: "12px"
                  }}
                >
                  <MapPin size={14} /> Open in LDN Spatial Map
                </Link>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
