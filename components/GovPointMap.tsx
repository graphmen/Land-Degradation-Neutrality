"use client";

import React, { useEffect, useRef } from "react";
import type LType from "leaflet";

export type GovMapPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  color?: string;
};

interface GovPointMapProps {
  points: GovMapPoint[];
  height?: number;
  zoom?: number;
}

export default function GovPointMap({
  points,
  height = 360,
  zoom = 6,
}: GovPointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerGroupRef = useRef<LType.LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [-19.0154, 29.1549],
          zoom,
          scrollWheelZoom: true,
        });

        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
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
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.85,
        });
        const popupHtml = `<div style="font-family:Inter,sans-serif;font-size:12px;">
          <strong>${p.title.replace(/</g, "&lt;")}</strong>
          ${p.subtitle ? `<div style="color:#4f6457;margin-top:2px;">${p.subtitle.replace(/</g, "&lt;")}</div>` : ""}
          <div style="font-family:monospace;font-size:11px;color:#5b7063;margin-top:3px;">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
        </div>`;
        marker.bindPopup(popupHtml);
        marker.addTo(group);
      }

      if (validPoints.length === 1) {
        map.setView([validPoints[0].lat, validPoints[0].lng], 12);
      } else if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
      } else {
        map.setView([-19.0154, 29.1549], 6);
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 80);
    }

    initMap();

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
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        borderRadius: 8,
        border: "1px solid #d9e2dc",
        overflow: "hidden",
        background: "#eef3f0",
      }}
    />
  );
}
