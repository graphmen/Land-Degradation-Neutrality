"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  geojson: {
    type: string;
    features: any[];
    total: number;
  };
  activeId?: string | number | null;
}

export default function MapView({ geojson, activeId }: Props) {
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

      // Compute centre from features
      let centerLat = -19.0154, centerLng = 29.1549; // Zimbabwe default
      if (geojson.features.length > 0) {
        const lats = geojson.features.map(f => f.geometry.coordinates[1]).filter(Boolean);
        const lngs = geojson.features.map(f => f.geometry.coordinates[0]).filter(Boolean);
        if (lats.length) {
          centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
          centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        }
      }

      const map = Leaflet.map(containerRef.current!, {
        center: [centerLat, centerLng],
        zoom: 10,
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

      // Google Streets (Roadmap)
      const googleStreets = Leaflet.tileLayer(
        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        { attribution: "© Google Maps", maxZoom: 20 }
      );

      // Google Terrain
      const googleTerrain = Leaflet.tileLayer(
        "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
        { attribution: "© Google Maps", maxZoom: 20 }
      );

      // Esri Satellite
      const esriSatellite = Leaflet.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "© Esri • Esri World Imagery", maxZoom: 19 }
      );

      // Dark tile layer
      const darkTile = Leaflet.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "© OpenStreetMap © CARTO", maxZoom: 19 }
      );

      Leaflet.control.layers(
        {
          "Google Hybrid": googleHybrid,
          "Google Satellite": googleSatellite,
          "Google Streets": googleStreets,
          "Google Terrain": googleTerrain,
          "Esri Satellite": esriSatellite,
          "CartoDB Dark": darkTile,
        },
        {},
        { position: "topright" }
      ).addTo(map);

      // Clear old marker references
      markersRef.current = {};

      geojson.features.forEach(feature => {
        const props = feature.properties || {};
        const [lng, lat] = feature.geometry.coordinates;

        // UNCCD Hotspot vs. Bright spot classification
        const isSoil = props._mapped_dep !== undefined || props.dep !== undefined;
        let isHotspot = false;
        let isBrightSpot = false;

        if (isSoil) {
          const texture = String(props._mapped_tex || props.tex || "").toLowerCase();
          const moisture = String(props._mapped_moist || props.moisture || "").toLowerCase();
          // Dry sandy soils are highly vulnerable to erosion/degradation
          if (texture.includes("sand") && moisture.includes("dry")) {
            isHotspot = true;
          } else if (texture.includes("loam") || texture.includes("silt")) {
            // Fertile soil textures with good retention
            isBrightSpot = true;
          }
        } else {
          const severity = String(props.sev || "").toLowerCase();
          if (severity.includes("high") || severity.includes("severe") || severity.includes("critical")) {
            isHotspot = true;
          } else if (severity.includes("low") || severity.includes("minimal") || severity.includes("stable") || severity.includes("none")) {
            isBrightSpot = true;
          }
        }

        let markerColor = "#3b82f6"; // Blue for baseline/neutral
        let statusLabel = "Baseline Monitoring";
        if (isHotspot) {
          markerColor = "#f43f5e"; // Red
          statusLabel = "Hotspot ⚠️";
        } else if (isBrightSpot) {
          markerColor = "#10b981"; // Emerald
          statusLabel = "Bright Spot 🌟";
        }

        const marker = Leaflet.circleMarker([lat, lng], {
          radius: 9,
          fillColor: markerColor,
          color: "#fff",
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.8,
        });

        // Build Popup HTML
        const title = isSoil ? "🧪 Soil Sample" : "🌳 LDN Assessment";
        const badgeClass = isHotspot ? "hotspot" : isBrightSpot ? "brightspot" : "";
        const badgeHtml = badgeClass ? `<div class="popup-badge ${badgeClass}">${statusLabel}</div>` : "";

        let rowsHtml = "";
        if (isSoil) {
          const mTex = props._mapped_tex || props.tex;
          const mDep = props._mapped_dep || props.dep;
          const mDist = props._mapped_dist || props.dist;
          const mLoc = props._mapped_loc || props.samloc;
          const mMoist = props._mapped_moist || props.moisture;
          const mCol = props._mapped_col || props.col;

          if (mLoc) rowsHtml += `<div class="popup-row"><span class="popup-key">📍 Location</span><span class="popup-val" style="color:#fbbf24">${mLoc}</span></div>`;
          if (mDist) rowsHtml += `<div class="popup-row"><span class="popup-key">🗺️ District</span><span class="popup-val">${mDist}</span></div>`;
          if (mTex) rowsHtml += `<div class="popup-row"><span class="popup-key">🏜️ Texture</span><span class="popup-val">${mTex}</span></div>`;
          if (mDep) rowsHtml += `<div class="popup-row"><span class="popup-key">⛏️ Depth</span><span class="popup-val">${mDep} cm</span></div>`;
          if (mMoist) rowsHtml += `<div class="popup-row"><span class="popup-key">💧 Moisture</span><span class="popup-val">${mMoist}</span></div>`;
          if (mCol) rowsHtml += `<div class="popup-row"><span class="popup-key">🎨 Color</span><span class="popup-val">${mCol}</span></div>`;
        } else {
          rowsHtml += `<div class="popup-row"><span class="popup-key">🗺️ District</span><span class="popup-val">${props.dist || "—"}</span></div>`;
          rowsHtml += `<div class="popup-row"><span class="popup-key">📍 Ward</span><span class="popup-val">${props.ward || "—"}</span></div>`;
          rowsHtml += `<div class="popup-row"><span class="popup-key">🌿 Landuse</span><span class="popup-val">${props.landus || "—"}</span></div>`;
          rowsHtml += `<div class="popup-row"><span class="popup-key">⚠️ Severity</span><span class="popup-val" style="color:#fb7185">${props.sev || "—"}</span></div>`;
        }

        marker.bindPopup(`<div class="popup-title">${title}</div>${badgeHtml}${rowsHtml}`, { maxWidth: 280 });
        marker.addTo(map);

        if (props._id) {
          markersRef.current[String(props._id)] = { marker, lat, lng };
        }
      });

      // Update state for legend (UNCCD aligned labels)
      setLegendItems([
        { name: "Degraded Hotspot ⚠️", color: "#f43f5e" },
        { name: "Restored Bright Spot 🌟", color: "#10b981" },
        { name: "Baseline Monitoring 🔵", color: "#3b82f6" }
      ]);

    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [geojson]);

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
        <div className="map-legend-overlay">
          <div className="legend-title">Legend</div>
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
