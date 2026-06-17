"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  records: any[];
  activeId?: string | number | null;
}

export default function InterventionsMapView({ records, activeId }: Props) {
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
      const validRecords = records.filter(r => r.lat != null && r.lng != null && !isNaN(r.lat) && !isNaN(r.lng));
      if (validRecords.length > 0) {
        centerLat = validRecords.reduce((a, b) => a + b.lat, 0) / validRecords.length;
        centerLng = validRecords.reduce((a, b) => a + b.lng, 0) / validRecords.length;
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

      records.forEach(r => {
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const category = String(r.category || "").toLowerCase();
        let markerColor = "#3b82f6"; // default blue

        if (category.includes("wetland")) {
          markerColor = "#0284c7"; // Blue/water
        } else if (category.includes("erosion")) {
          markerColor = "#f59e0b"; // Orange/erosion
        } else if (category.includes("forest") || category.includes("reforestation")) {
          markerColor = "#006633"; // Forest green
        } else if (category.includes("gully")) {
          markerColor = "#dc2626"; // Rose/red
        } else if (category.includes("sustainable")) {
          markerColor = "#84cc16"; // Lime/SLM
        } else if (category.includes("crop") || category.includes("cropland")) {
          markerColor = "#10b981"; // Emerald
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
        const badgeClass = r.status?.toLowerCase() === "completed" 
          ? "active-status" 
          : r.status?.toLowerCase() === "ongoing"
          ? "warning-status"
          : "danger-status";
        
        const badgeLabel = r.status || "Planned";

        const popupHtml = `
          <div style="font-family: var(--font-body); padding: 2px;">
            <div style="font-size: 13px; font-weight: 700; color: #122218; margin-bottom: 4px;">🛠️ ${r.name}</div>
            <div style="display: flex; gap: 4px; margin-bottom: 8px; align-items: center;">
              <span class="site-badge" style="font-size: 8px; padding: 1px 6px; background: rgba(0, 102, 51, 0.08); color: #006633; border: 1px solid rgba(0, 102, 51, 0.15); border-radius: 10px;">
                ${r.category}
              </span>
              <span class="site-badge" style="font-size: 8px; padding: 1px 6px; border-radius: 10px; font-weight: 700; border: 1px solid;
                ${badgeClass === "active-status" ? "background:#eafbf1; color:#15803d; border-color:#bbf7d0;" : ""}
                ${badgeClass === "warning-status" ? "background:#fffbeb; color:#b45309; border-color:#fef3c7;" : ""}
                ${badgeClass === "danger-status" ? "background:#fef2f2; color:#b91c1c; border-color:#fee2e2;" : ""}
              ">
                ${badgeLabel}
              </span>
            </div>
            <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
              <span style="color:#5a6e62;">Organisation:</span>
              <strong style="color:#122218;">${r.org}</strong>
            </div>
            <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
              <span style="color:#5a6e62;">Admin Area:</span>
              <span style="color:#122218; font-weight:500;">${r.admin_area} (${r.admin_level})</span>
            </div>
            <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
              <span style="color:#5a6e62;">Size:</span>
              <span style="color:#122218; font-weight:500;">${r.size}</span>
            </div>
            <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
              <span style="color:#5a6e62;">Budget:</span>
              <span style="color:#006633; font-weight:700;">${r.budget.split(" / ")[0]}</span>
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
        { name: "Wetland Protection 🔵", color: "#0284c7" },
        { name: "Erosion Control 🟡", color: "#f59e0b" },
        { name: "Forest Reforestation 🟢", color: "#006633" },
        { name: "Gully Reclamation 🔴", color: "#dc2626" },
        { name: "Sustainable Land Mgmt 🟢", color: "#84cc16" },
        { name: "Conservation Cropland 🟢", color: "#10b981" }
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
        <div className="map-legend-overlay" style={{ bottom: "24px", left: "24px", width: "220px" }}>
          <div className="legend-title">Intervention Types</div>
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
