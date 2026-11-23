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

export type GovMapLegendItem = {
  label: string;
  color: string;
  count?: number;
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
  legend,
}: GovPointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerGroupRef = useRef<LType.LayerGroup | null>(null);

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

        addBaseTileLayers(L, map);

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
      } else if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
      } else {
        map.setView([-19.0154, 29.1549], 6);
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    initOrUpdate();

    return () => {
      cancelled = true;
    };
  }, [points, zoom]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
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
            minWidth: 180,
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
