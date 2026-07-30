"use client";
import { useEffect, useRef, useState } from "react";
import {
  DRYLANDS_LEGEND,
  addBaseTileLayers,
  classifyDrylandsRecord,
  createMarkerClusterGroup,
  createPinIcon,
  focusMarker,
  loadLeafletWithCluster,
} from "@/lib/map-markers";

interface Props {
  records: any[];
  activeId?: string | number | null;
  onSelect?: (id: string | number) => void;
}

export default function DrylandsMapView({ records, activeId, onSelect }: Props) {
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [mapReady, setMapReady] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;

    let cancelled = false;

    loadLeafletWithCluster().then(({ Leaflet }) => {
      if (cancelled || !containerRef.current) return;

      leafletRef.current = Leaflet;

      const map = Leaflet.map(containerRef.current!, {
        center: [-19.0154, 29.1549],
        zoom: 7,
        zoomControl: false,
      });
      mapRef.current = map;

      Leaflet.control.zoom({ position: "topleft" }).addTo(map);
      addBaseTileLayers(Leaflet, map);

      const cluster = createMarkerClusterGroup(Leaflet);
      clusterRef.current = cluster;
      map.addLayer(cluster);

      setMapReady(true);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
        leafletRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !clusterRef.current || !leafletRef.current) return;

    const Leaflet = leafletRef.current;
    const cluster = clusterRef.current;
    const map = mapRef.current;

    cluster.clearLayers();
    markersRef.current = {};

    const parsedRecords = records
      .map((r) => {
        let lat = typeof r.lat === "number" ? r.lat : parseFloat(r.lat);
        let lng = typeof r.lng === "number" ? r.lng : parseFloat(r.lng);

        if ((isNaN(lat) || isNaN(lng)) && r.coordinates) {
          const parts = String(r.coordinates).trim().split(/[\s,]+/);
          if (parts.length >= 2) {
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
          }
        }

        if ((isNaN(lat) || isNaN(lng)) && r.raw_data) {
          const raw = r.raw_data;
          const rawLat = raw._5_Coordinates_latitude || raw["_5. Coordinates_latitude"];
          const rawLng = raw._5_Coordinates_longitude || raw["_5. Coordinates_longitude"];
          if (rawLat && rawLng) {
            lat = parseFloat(rawLat);
            lng = parseFloat(rawLng);
          } else if (raw["5. Coordinates"]) {
            const parts = String(raw["5. Coordinates"]).trim().split(/\s+/);
            if (parts.length >= 2) {
              lat = parseFloat(parts[0]);
              lng = parseFloat(parts[1]);
            }
          }
        }

        // Swap if lat/lng are inverted
        if (lat > 0 && lng < 0) {
          const tmp = lat;
          lat = lng;
          lng = tmp;
        }

        return { ...r, _parsedLat: lat, _parsedLng: lng };
      })
      .filter((r) => !isNaN(r._parsedLat) && !isNaN(r._parsedLng) && r._parsedLat >= -23.0 && r._parsedLat <= -15.0 && r._parsedLng >= 24.0 && r._parsedLng <= 34.0);

    const bounds = Leaflet.latLngBounds([]);

    parsedRecords.forEach((r) => {
      const lat = r._parsedLat;
      const lng = r._parsedLng;
      const visual = classifyDrylandsRecord(r);

      const priority = String(r.priority_level || "").toLowerCase();
      const badgeClass = priority.includes("high")
        ? "danger-status"
        : priority.includes("medium")
        ? "warning-status"
        : "active-status";

      const marker = Leaflet.marker([lat, lng], {
        icon: createPinIcon(Leaflet, visual),
      });

      const photoUrl = r.photo_1_url || r.photo_2_url || r.photo_3_url;
      const photoHtml = photoUrl
        ? `<div style="width:100%; height:110px; border-radius:6px; overflow:hidden; margin-bottom:8px; background:#000;">
             <img src="/api/media?url=${encodeURIComponent(photoUrl)}" style="width:100%; height:100%; object-fit:cover;" />
           </div>`
        : "";

      const popupHtml = `
        <div style="font-family: var(--font-body); padding: 2px;">
          ${photoHtml}
          <div style="font-size: 13px; font-weight: 700; color: #122218; margin-bottom: 4px;">${visual.icon} ${r.village_location || "Unknown Village"}</div>
          <div style="display: flex; gap: 4px; margin-bottom: 8px; align-items: center;">
            <span class="site-badge" style="font-size: 8px; padding: 1px 6px; background: rgba(0, 102, 51, 0.08); color: #006633; border: 1px solid rgba(0, 102, 51, 0.15); border-radius: 10px;">
              ${r.ward_name ? (String(r.ward_name).startsWith('Ward') ? r.ward_name : `Ward ${r.ward_name}`) : "Ward"}
            </span>
            <span class="site-badge" style="font-size: 8px; padding: 1px 6px; border-radius: 10px; font-weight: 700; border: 1px solid;
              ${badgeClass === "active-status" ? "background:#eafbf1; color:#15803d; border-color:#bbf7d0;" : ""}
              ${badgeClass === "warning-status" ? "background:#fffbeb; color:#b45309; border-color:#fef3c7;" : ""}
              ${badgeClass === "danger-status" ? "background:#fef2f2; color:#b91c1c; border-color:#fee2e2;" : ""}
            ">
              ${r.priority_level || "Low Priority"}
            </span>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color:#5a6e62;">Enumerator:</span>
            <strong style="color:#122218;">${r.enumerator_name || "Unknown"}</strong>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color:#5a6e62;">Area Type:</span>
            <span style="color:#122218; font-weight:600;">${r.area_type || "Land"}</span>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color:#5a6e62;">Vegetation:</span>
            <span style="color:#122218; font-weight:500;">${r.vegetation_condition || "Unknown"} (${r.estimated_vegetation_cover ?? '—'}%)</span>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color:#5a6e62;">Soil Type:</span>
            <span style="color:#122218; font-weight:500;">${r.dominant_soil_type || "Unknown"}</span>
          </div>
          <div style="font-size: 11px; margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px;">
            <span style="color:#5a6e62; display:block; margin-bottom:2px;">Interventions:</span>
            <span style="color:#006633; font-weight:700;">${Array.isArray(r.recommended_interventions) ? r.recommended_interventions.join(", ") : r.recommended_interventions || "None"}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on("click", () => {
        const recordId = r._id || r.id;
        if (onSelect && recordId != null) {
          onSelect(recordId);
        }
      });

      cluster.addLayer(marker);
      bounds.extend([lat, lng]);

      if (r._id) {
        markersRef.current[String(r._id)] = { marker, lat, lng };
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
    }
  }, [records, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !clusterRef.current || !activeId) return;
    const target = markersRef.current[String(activeId)];
    if (target) {
      const { marker, lat, lng } = target;
      focusMarker(mapRef.current, clusterRef.current, marker, lat, lng);
    }
  }, [activeId, mapReady]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        className="map-legend-overlay"
        style={{
          bottom: "24px",
          left: "24px",
          width: isLegendCollapsed ? "auto" : "210px",
          padding: isLegendCollapsed ? "8px 14px" : "14px",
          transition: "all 0.2s ease"
        }}
      >
        <div
          className="legend-title"
          onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            marginBottom: isLegendCollapsed ? 0 : "10px",
            userSelect: "none"
          }}
          title={isLegendCollapsed ? "Expand legend" : "Collapse legend"}
        >
          <span>Priority Levels</span>
          <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: "12px" }}>
            {isLegendCollapsed ? "▲ Expand" : "▼ Collapse"}
          </span>
        </div>
        {!isLegendCollapsed && (
          <>
            <div className="legend-list">
              {DRYLANDS_LEGEND.map((item, idx) => (
                <div className="legend-item" key={idx}>
                  <span className="legend-icon-pin" style={{ background: item.color }}>
                    <span>{item.icon}</span>
                  </span>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
            <div className="legend-footnote">Markers cluster when zoomed out</div>
          </>
        )}
      </div>
    </div>
  );
}
