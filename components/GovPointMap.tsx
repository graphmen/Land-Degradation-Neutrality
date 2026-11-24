"use client";

import React, { useEffect, useRef } from "react";
import type LType from "leaflet";
import { addBaseTileLayers } from "@/lib/map-markers";

export type GovMapPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  color?: string;
  layerLabel?: string;
};

export type GovMapPolygon = {
  id: string;
  geometry: GeoJSON.Polygon;
  title: string;
  subtitle?: string;
  color: string;
  layerLabel?: string;
  areaHa?: number | null;
};

export type GovBoundaryOverlay = {
  id: string;
  label: string;
  geojson: GeoJSON.GeoJsonObject;
  color: string;
  weight: number;
  dashArray?: string;
  fillOpacity?: number;
};

export type GovMapLegendItem = {
  label: string;
  color: string;
  count?: number;
  isLine?: boolean;
};

interface GovPointMapProps {
  points: GovMapPoint[];
  polygons?: GovMapPolygon[];
  boundaries?: GovBoundaryOverlay[];
  height?: number;
  zoom?: number;
  showBasemapSwitcher?: boolean;
  legend?: GovMapLegendItem[];
}

export default function GovPointMap({
  points,
  polygons,
  boundaries,
  height = 360,
  zoom = 6,
  legend,
}: GovPointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const boundaryGroupRef = useRef<LType.LayerGroup | null>(null);
  const polygonGroupRef = useRef<LType.LayerGroup | null>(null);
  const pointGroupRef = useRef<LType.LayerGroup | null>(null);
  const hasFitInitialRef = useRef(false);

  // Initialize map + update point markers
  useEffect(() => {
    let cancelled = false;

    async function initOrUpdatePoints() {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [-19.0154, 29.1549],
          zoom,
          scrollWheelZoom: true,
          preferCanvas: true,
        });

        addBaseTileLayers(L, map);

        mapRef.current = map;
        boundaryGroupRef.current = L.layerGroup().addTo(map);
        polygonGroupRef.current = L.layerGroup().addTo(map);
        pointGroupRef.current = L.layerGroup().addTo(map);
      }

      const map = mapRef.current;
      const group = pointGroupRef.current;
      if (!map || !group) return;

      group.clearLayers();

      const validPoints = points.filter(
        (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0)
      );

      for (const p of validPoints) {
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: validPoints.length === 1 ? 9 : 6,
          fillColor: p.color ?? "#16a34a",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.92,
        });
        const popupHtml = `<div style="font-family:Inter,sans-serif;font-size:12px;min-width:170px;">
          ${p.layerLabel ? `<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${p.color ?? "#005a2b"};margin-bottom:2px;">${p.layerLabel.replace(/</g, "&lt;")}</div>` : ""}
          <strong>${p.title.replace(/</g, "&lt;")}</strong>
          ${p.subtitle ? `<div style="color:#4f6457;margin-top:2px;">${p.subtitle.replace(/</g, "&lt;")}</div>` : ""}
          <div style="font-family:monospace;font-size:11px;color:#5b7063;margin-top:4px;">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
        </div>`;
        marker.bindPopup(popupHtml);
        marker.addTo(group);
      }

      if (validPoints.length === 1) {
        map.setView([validPoints[0].lat, validPoints[0].lng], 13);
      } else if (validPoints.length > 1 && !hasFitInitialRef.current) {
        const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
        hasFitInitialRef.current = true;
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    initOrUpdatePoints();

    return () => {
      cancelled = true;
    };
  }, [points, zoom]);

  // Render administrative boundary overlays (Provinces / Districts / Wards)
  useEffect(() => {
    let cancelled = false;

    async function renderBoundaries() {
      const map = mapRef.current;
      const bGroup = boundaryGroupRef.current;
      if (!map || !bGroup) return;

      const L = (await import("leaflet")).default;
      if (cancelled || !boundaryGroupRef.current) return;

      bGroup.clearLayers();

      for (const overlay of boundaries ?? []) {
        const gjLayer = L.geoJSON(overlay.geojson, {
          style: () => ({
            color: overlay.color,
            weight: overlay.weight,
            dashArray: overlay.dashArray,
            fillColor: overlay.color,
            fillOpacity: overlay.fillOpacity ?? 0.04,
            opacity: 0.9,
          }),
          onEachFeature: (feature, layer) => {
            const props = (feature.properties ?? {}) as Record<string, unknown>;
            const name = String(props.shapeName ?? props.NAME ?? props.name ?? "Boundary");
            const type = String(props.shapeType ?? overlay.label);
            layer.bindTooltip(
              `<div style="font-family:Inter,sans-serif;font-size:11px;"><strong>${name.replace(/</g, "&lt;")}</strong> <span style="opacity:0.75;">(${type})</span></div>`,
              { sticky: true, direction: "top" }
            );
            layer.on("mouseover", () => {
              if ("setStyle" in layer && typeof (layer as LType.Path).setStyle === "function") {
                (layer as LType.Path).setStyle({
                  weight: overlay.weight + 1.2,
                  fillOpacity: Math.min((overlay.fillOpacity ?? 0.04) + 0.12, 0.25),
                });
              }
            });
            layer.on("mouseout", () => {
              gjLayer.resetStyle(layer);
            });
          },
        });
        gjLayer.addTo(bGroup);
      }

      // Ensure points remain clickable above polygon boundaries
      if (pointGroupRef.current) {
        pointGroupRef.current.eachLayer((l) => {
          if ("bringToFront" in l && typeof (l as LType.Path).bringToFront === "function") {
            (l as LType.Path).bringToFront();
          }
        });
      }
    }

    renderBoundaries();

    return () => {
      cancelled = true;
    };
  }, [boundaries, points]);

  // Render field-walked polygon submissions (Pressures & Restoration SO4)
  useEffect(() => {
    let cancelled = false;

    async function renderFieldPolygons() {
      const map = mapRef.current;
      const pGroup = polygonGroupRef.current;
      if (!map || !pGroup) return;

      const L = (await import("leaflet")).default;
      if (cancelled || !polygonGroupRef.current) return;

      pGroup.clearLayers();

      for (const poly of polygons ?? []) {
        const gj = L.geoJSON(poly.geometry, {
          style: () => ({
            color: poly.color,
            weight: 2.5,
            fillColor: poly.color,
            fillOpacity: 0.28,
            opacity: 0.95,
          }),
          onEachFeature: (_feature, layer) => {
            const areaText =
              poly.areaHa != null && Number.isFinite(poly.areaHa)
                ? `<div style="font-family:monospace;font-size:11px;color:#005a2b;font-weight:700;margin-top:4px;">Area: ${poly.areaHa.toFixed(2)} ha</div>`
                : "";
            layer.bindPopup(
              `<div style="font-family:Inter,sans-serif;font-size:12px;min-width:180px;">
                ${poly.layerLabel ? `<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${poly.color};margin-bottom:2px;">${poly.layerLabel.replace(/</g, "&lt;")}</div>` : ""}
                <strong>${poly.title.replace(/</g, "&lt;")}</strong>
                ${poly.subtitle ? `<div style="color:#4f6457;margin-top:2px;">${poly.subtitle.replace(/</g, "&lt;")}</div>` : ""}
                ${areaText}
              </div>`
            );
          },
        });
        gj.addTo(pGroup);
      }
    }

    renderFieldPolygons();

    return () => {
      cancelled = true;
    };
  }, [polygons, points]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        boundaryGroupRef.current = null;
        polygonGroupRef.current = null;
        pointGroupRef.current = null;
        hasFitInitialRef.current = false;
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 8,
          border: "1px solid #d9e2dc",
          overflow: "hidden",
          background: "#1b2a22",
        }}
      />

      {legend && legend.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 14,
            zIndex: 500,
            background: "rgba(255,255,255,0.95)",
            border: "1px solid #cbd7cf",
            borderRadius: 8,
            padding: "9px 12px",
            boxShadow: "0 3px 12px rgba(0,0,0,0.22)",
            display: "flex",
            flexDirection: "column",
            gap: 5,
            minWidth: 190,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#4f6457",
            }}
          >
            Active Map Layers
          </div>
          {legend.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 11,
                color: "#102117",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                {item.isLine ? (
                  <span
                    style={{
                      width: 14,
                      height: 3,
                      borderRadius: 2,
                      background: item.color,
                      border: "0.5px solid rgba(0,0,0,0.3)",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: item.color,
                      border: "1.5px solid #ffffff",
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
                    }}
                  />
                )}
                {item.label}
              </span>
              {item.count != null && (
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#4f6457" }}>
                  {item.count.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
