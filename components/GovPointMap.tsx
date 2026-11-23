"use client";

import React, { useEffect, useRef, useState } from "react";
import type LType from "leaflet";

export type GovMapPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  color?: string;
  layerLabel?: string;
};

export type GovMapLegendItem = {
  label: string;
  color: string;
  count?: number;
};

type BasemapId = "light" | "satellite" | "topo";

const BASEMAPS: Record<BasemapId, { label: string; url: string; attribution: string }> = {
  light: {
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri World Imagery",
  },
  topo: {
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap",
  },
};

interface GovPointMapProps {
  points: GovMapPoint[];
  height?: number;
  zoom?: number;
  showBasemapSwitcher?: boolean;
  legend?: GovMapLegendItem[];
}

export default function GovPointMap({
  points,
  height = 360,
  zoom = 6,
  showBasemapSwitcher = false,
  legend,
}: GovPointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const tileLayerRef = useRef<LType.TileLayer | null>(null);
  const layerGroupRef = useRef<LType.LayerGroup | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>("light");

  useEffect(() => {
    let cancelled = false;

    async function initOrUpdate() {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [-19.0154, 29.1549],
          zoom,
          scrollWheelZoom: true,
        });

        const bm = BASEMAPS[basemap];
        tileLayerRef.current = L.tileLayer(bm.url, {
          attribution: bm.attribution,
          maxZoom: 18,
        }).addTo(map);

        mapRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);
      }

      const map = mapRef.current;
      const group = layerGroupRef.current;
      if (!map || !group) return;

      group.clearLayers();

      const validPoints = points.filter(
        (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0)
      );

      for (const p of validPoints) {
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: validPoints.length === 1 ? 8 : 5,
          fillColor: p.color ?? "#005a2b",
          color: "#ffffff",
          weight: 1.4,
          opacity: 1,
          fillOpacity: 0.88,
        });
        const popupHtml = `<div style="font-family:Inter,sans-serif;font-size:12px;min-width:160px;">
          ${p.layerLabel ? `<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${p.color ?? "#005a2b"};margin-bottom:2px;">${p.layerLabel.replace(/</g, "&lt;")}</div>` : ""}
          <strong>${p.title.replace(/</g, "&lt;")}</strong>
          ${p.subtitle ? `<div style="color:#4f6457;margin-top:2px;">${p.subtitle.replace(/</g, "&lt;")}</div>` : ""}
          <div style="font-family:monospace;font-size:11px;color:#5b7063;margin-top:4px;">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
        </div>`;
        marker.bindPopup(popupHtml);
        marker.addTo(group);
      }

      if (validPoints.length === 1) {
        map.setView([validPoints[0].lat, validPoints[0].lng], 12);
      } else if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [26, 26], maxZoom: 10 });
      } else {
        map.setView([-19.0154, 29.1549], 6);
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 80);
    }

    initOrUpdate();

    return () => {
      cancelled = true;
    };
  }, [points, zoom]);

  // Swap tile layer when basemap changes
  useEffect(() => {
    let cancelled = false;
    async function swapTiles() {
      const map = mapRef.current;
      if (!map) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
      const bm = BASEMAPS[basemap];
      tileLayerRef.current = L.tileLayer(bm.url, {
        attribution: bm.attribution,
        maxZoom: 18,
      }).addTo(map);
      tileLayerRef.current.bringToBack();
    }
    swapTiles();
    return () => {
      cancelled = true;
    };
  }, [basemap]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
        layerGroupRef.current = null;
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
          background: "#eef3f0",
        }}
      />

      {showBasemapSwitcher && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 500,
            display: "flex",
            background: "rgba(255,255,255,0.94)",
            border: "1px solid #cbd7cf",
            borderRadius: 7,
            padding: 3,
            gap: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setBasemap(id)}
              style={{
                border: "none",
                borderRadius: 5,
                padding: "4px 9px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: basemap === id ? "#005a2b" : "transparent",
                color: basemap === id ? "#ffffff" : "#2d4336",
              }}
            >
              {BASEMAPS[id].label}
            </button>
          ))}
        </div>
      )}

      {legend && legend.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            zIndex: 500,
            background: "rgba(255,255,255,0.94)",
            border: "1px solid #cbd7cf",
            borderRadius: 8,
            padding: "8px 11px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 5,
            minWidth: 165,
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
                gap: 8,
                fontSize: 11,
                color: "#102117",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: item.color,
                    border: "1px solid rgba(0,0,0,0.2)",
                  }}
                />
                {item.label}
              </span>
              {item.count != null && (
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#4f6457" }}>
                  {item.count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
