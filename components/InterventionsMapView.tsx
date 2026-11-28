"use client";
import { useEffect, useRef, useState } from "react";
import {
  INTERVENTIONS_LEGEND,
  addBaseTileLayers,
  classifyInterventionRecord,
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

export default function InterventionsMapView({ records, activeId, onSelect }: Props) {
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});
  const boundsRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(true);

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

    const bounds = Leaflet.latLngBounds([]);

    records.forEach((r) => {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      // Exclude out-of-Zimbabwe coordinates (e.g. missing minus sign placing points in Sudan)
      if (lat < -22.6 || lat > -15.4 || lng < 25.0 || lng > 33.2) return;

      const visual = classifyInterventionRecord(r);
      const badgeClass =
        r.status?.toLowerCase() === "completed"
          ? "active-status"
          : r.status?.toLowerCase() === "ongoing"
          ? "warning-status"
          : "danger-status";

      const marker = Leaflet.marker([lat, lng], {
        icon: createPinIcon(Leaflet, visual),
      });

      const budgetText =
        typeof r.budget === "string" && r.budget.trim()
          ? r.budget.split(" / ")[0]
          : r.budget != null
            ? String(r.budget)
            : "—";

      const popupHtml = `
        <div style="font-family: var(--font-body); padding: 2px;">
          <div style="font-size: 13px; font-weight: 700; color: #122218; margin-bottom: 4px;">${visual.icon} ${r.name || "Intervention"}</div>
          <div style="display: flex; gap: 4px; margin-bottom: 8px; align-items: center;">
            <span class="site-badge" style="font-size: 8px; padding: 1px 6px; background: rgba(0, 102, 51, 0.08); color: #006633; border: 1px solid rgba(0, 102, 51, 0.15); border-radius: 10px;">
              ${r.category || "Restoration"}
            </span>
            <span class="site-badge" style="font-size: 8px; padding: 1px 6px; border-radius: 10px; font-weight: 700; border: 1px solid;
              ${badgeClass === "active-status" ? "background:#eafbf1; color:#15803d; border-color:#bbf7d0;" : ""}
              ${badgeClass === "warning-status" ? "background:#fffbeb; color:#b45309; border-color:#fef3c7;" : ""}
              ${badgeClass === "danger-status" ? "background:#fef2f2; color:#b91c1c; border-color:#fee2e2;" : ""}
            ">
              ${r.status || "Planned"}
            </span>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color:#5a6e62;">Organisation:</span>
            <strong style="color:#122218;">${r.org || "EMA"}</strong>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color:#5a6e62;">Admin Area:</span>
            <span style="color:#122218; font-weight:500;">${r.admin_area || "—"}${r.admin_level ? ` (${r.admin_level})` : ""}</span>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color:#5a6e62;">Size:</span>
            <span style="color:#122218; font-weight:500;">${r.size || "—"}</span>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color:#5a6e62;">Budget:</span>
            <span style="color:#006633; font-weight:700;">${budgetText}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on("click", () => {
        if (onSelect && r._id != null) {
          onSelect(r._id);
        }
      });

      cluster.addLayer(marker);
      bounds.extend([lat, lng]);

      if (r._id) {
        markersRef.current[String(r._id)] = { marker, lat, lng };
      }
    });

    boundsRef.current = bounds;
    if (bounds.isValid()) {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12, animate: false });
      window.setTimeout(() => {
        if (mapRef.current && boundsRef.current?.isValid()) {
          mapRef.current.invalidateSize();
          mapRef.current.fitBounds(boundsRef.current, { padding: [36, 36], maxZoom: 12 });
        }
      }, 280);
    }
  }, [records, mapReady]);

  const handleZoomToLayer = () => {
    if (mapRef.current && boundsRef.current?.isValid()) {
      mapRef.current.invalidateSize();
      mapRef.current.fitBounds(boundsRef.current, { padding: [36, 36], maxZoom: 12 });
    }
  };

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
      <button
        type="button"
        onClick={handleZoomToLayer}
        title="Zoom to Layer"
        style={{
          position: "absolute",
          top: 66,
          right: 10,
          zIndex: 500,
          background: "#ffffff",
          color: "#11181c",
          border: "1px solid #c5ccd3",
          borderRadius: 4,
          padding: "5px 10px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 1px 4px rgba(0,0,0,0.16)",
        }}
      >
        Zoom to Layer
      </button>
      <div
        className="map-legend-overlay"
        style={{
          bottom: "24px",
          left: "24px",
          width: isLegendCollapsed ? "auto" : "230px",
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
          <span>Intervention Types</span>
          <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: "12px" }}>
            {isLegendCollapsed ? "▲ Expand" : "▼ Collapse"}
          </span>
        </div>
        {!isLegendCollapsed && (
          <>
            <div className="legend-list">
              {INTERVENTIONS_LEGEND.map((item, idx) => (
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
