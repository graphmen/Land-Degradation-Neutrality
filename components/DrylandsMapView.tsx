"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  records: any[];
  activeId?: string | number | null;
}

export default function DrylandsMapView({ records, activeId }: Props) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [legendItems, setLegendItems] = useState<{ name: string; color: string }[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if (mapRef.current) return; // already initialized

    // Dynamic import to avoid SSR
    import("leaflet").then((L) => {
      const Leaflet = L.default || L;

      // Fix default marker icons
      delete (Leaflet.Icon.Default.prototype as any)._getIconUrl;
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Compute centre from records
      let centerLat = -19.0154, centerLng = 29.1549; // Zimbabwe default
      const parsedRecords = records.map(r => {
        const parts = (r.coordinates || "").trim().split(/\s+/);
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        return { ...r, _parsedLat: lat, _parsedLng: lng };
      }).filter(r => !isNaN(r._parsedLat) && !isNaN(r._parsedLng));

      if (parsedRecords.length > 0) {
        centerLat = parsedRecords.reduce((a, b) => a + b._parsedLat, 0) / parsedRecords.length;
        centerLng = parsedRecords.reduce((a, b) => a + b._parsedLng, 0) / parsedRecords.length;
      }

      const map = Leaflet.map(containerRef.current!, {
        center: [centerLat, centerLng],
        zoom: 7,
        zoomControl: false,
      });
      mapRef.current = map;

      Leaflet.control.zoom({ position: "topleft" }).addTo(map);

      // Google Hybrid (Satellite + Roads/Labels) - default
      const googleHybrid = Leaflet.tileLayer(
        "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        { attribution: "© Google Maps", maxZoom: 20 }
      ).addTo(map);

      // Google Satellite
      const googleSatellite = Leaflet.tileLayer(
        "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        { attribution: "© Google Maps", maxZoom: 20 }
      );

      // Google Streets
      const googleStreets = Leaflet.tileLayer(
        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        { attribution: "© Google Maps", maxZoom: 20 }
      );

      // Esri Satellite
      const esriSatellite = Leaflet.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "© Esri • Esri World Imagery", maxZoom: 19 }
      );

      // CartoDB Dark
      const darkTile = Leaflet.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "© OpenStreetMap © CARTO", maxZoom: 19 }
      );

      Leaflet.control.layers(
        {
          "Google Hybrid": googleHybrid,
          "Google Satellite": googleSatellite,
          "Google Streets": googleStreets,
          "Esri Satellite": esriSatellite,
          "CartoDB Dark": darkTile,
        },
        {},
        { position: "topright" }
      ).addTo(map);

      // Clear old marker references
      markersRef.current = {};

      parsedRecords.forEach(r => {
        const lat = r._parsedLat;
        const lng = r._parsedLng;

        const priority = String(r.priority_level || "").toLowerCase();
        let markerColor = "#3b82f6"; // default blue

        if (priority.includes("high")) {
          markerColor = "#dc2626"; // Red
        } else if (priority.includes("medium")) {
          markerColor = "#f59e0b"; // Amber/yellow
        } else if (priority.includes("low")) {
          markerColor = "#16a34a"; // Green
        }

        const marker = Leaflet.circleMarker([lat, lng], {
          radius: 10,
          fillColor: markerColor,
          color: "#fff",
          weight: 2.5,
          opacity: 0.9,
          fillOpacity: 0.85,
        });

        // Build Popup HTML
        const badgeClass = priority.includes("high")
          ? "danger-status"
          : priority.includes("medium")
          ? "warning-status"
          : "active-status";

        const badgeLabel = r.priority_level || "Low";

        const popupHtml = `
          <div style="font-family: var(--font-body); padding: 2px;">
            <div style="font-size: 13px; font-weight: 700; color: #122218; margin-bottom: 4px;">🏜️ ${r.village_location || "Unknown Village"}</div>
            <div style="display: flex; gap: 4px; margin-bottom: 8px; align-items: center;">
              <span class="site-badge" style="font-size: 8px; padding: 1px 6px; background: rgba(0, 102, 51, 0.08); color: #006633; border: 1px solid rgba(0, 102, 51, 0.15); border-radius: 10px;">
                ${r.ward_name || "Ward"}
              </span>
              <span class="site-badge" style="font-size: 8px; padding: 1px 6px; border-radius: 10px; font-weight: 700; border: 1px solid;
                ${badgeClass === "active-status" ? "background:#eafbf1; color:#15803d; border-color:#bbf7d0;" : ""}
                ${badgeClass === "warning-status" ? "background:#fffbeb; color:#b45309; border-color:#fef3c7;" : ""}
                ${badgeClass === "danger-status" ? "background:#fef2f2; color:#b91c1c; border-color:#fee2e2;" : ""}
              ">
                Priority: ${badgeLabel}
              </span>
            </div>
            <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
              <span style="color:#5a6e62;">Enumerator:</span>
              <strong style="color:#122218;">${r.enumerator_name || "Unknown"}</strong>
            </div>
            <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
              <span style="color:#5a6e62;">Vegetation:</span>
              <span style="color:#122218; font-weight:500;">${r.vegetation_condition || "Unknown"}</span>
            </div>
            <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
              <span style="color:#5a6e62;">Soil Type:</span>
              <span style="color:#122218; font-weight:500;">${r.dominant_soil_type || "Unknown"}</span>
            </div>
            <div style="font-size: 11px; margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px;">
              <span style="color:#5a6e62; display:block; margin-bottom:2px;">Interventions:</span>
              <span style="color:#006633; font-weight:700;">${Array.isArray(r.recommended_interventions) ? r.recommended_interventions.join(", ") : (r.recommended_interventions || "None")}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 280 });
        marker.addTo(map);

        if (r._id) {
          markersRef.current[String(r._id)] = { marker, lat, lng };
        }
      });

      // Update state for legend
      setLegendItems([
        { name: "High Priority 🔴", color: "#dc2626" },
        { name: "Medium Priority 🟡", color: "#f59e0b" },
        { name: "Low Priority 🟢", color: "#16a34a" }
      ]);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [records]);

  useEffect(() => {
    if (!mapRef.current || !activeId) return;
    const target = markersRef.current[String(activeId)];
    if (target) {
      const { marker, lat, lng } = target;
      mapRef.current.flyTo([lat, lng], 13, { duration: 1.5 });
      setTimeout(() => {
        marker.openPopup();
      }, 1500);
    }
  }, [activeId]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {legendItems.length > 0 && (
        <div className="map-legend-overlay" style={{ bottom: "24px", left: "24px", width: "200px" }}>
          <div className="legend-title">Priority Levels</div>
          <div className="legend-list">
            {legendItems.map((item, idx) => (
              <div className="legend-item" key={idx}>
                <span className="legend-color" style={{ background: item.color }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
