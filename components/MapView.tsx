"use client";
import { useEffect, useRef, useState } from "react";
import {
  LDN_LEGEND,
  LDN_SOIL_LEGEND,
  SOIL_LEGEND,
  addBaseTileLayers,
  classifyLdnSoilFeature,
  createMarkerClusterGroup,
  createPinIcon,
  focusMarker,
  loadLeafletWithCluster,
  type LegendItem,
} from "@/lib/map-markers";

interface Props {
  geojson: {
    type: string;
    features: any[];
    total: number;
  };
  activeId?: string | number | null;
  onSelect?: (id: string | number) => void;
  mode?: "ldn" | "soil" | "mixed";
}

export default function MapView({ geojson, activeId, onSelect, mode = "mixed" }: Props) {
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});
  const hasFitBoundsRef = useRef(false);
  const skipNextFocusRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(true);

  const legendItems: LegendItem[] =
    mode === "ldn" ? LDN_LEGEND : mode === "soil" ? SOIL_LEGEND : LDN_SOIL_LEGEND;

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;

    let cancelled = false;

    loadLeafletWithCluster()
      .then(({ Leaflet }) => {
        if (cancelled || !containerRef.current) return;

        leafletRef.current = Leaflet;

        let centerLat = -19.0154;
        let centerLng = 29.1549;
        if (geojson.features.length > 0) {
          const lats = geojson.features.map((f) => f.geometry.coordinates[1]).filter(Boolean);
          const lngs = geojson.features.map((f) => f.geometry.coordinates[0]).filter(Boolean);
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
        addBaseTileLayers(Leaflet, map);

        const cluster = createMarkerClusterGroup(Leaflet);
        clusterRef.current = cluster;
        map.addLayer(cluster);

        setMapReady(true);
      })
      .catch((err) => {
        console.error("Failed to initialize map:", err);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
        leafletRef.current = null;
        hasFitBoundsRef.current = false;
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
    let markerCount = 0;

    geojson.features.forEach((feature) => {
      const props = feature.properties || {};
      const [lng, lat] = feature.geometry.coordinates;
      if (lat == null || lng == null || Number.isNaN(+lat) || Number.isNaN(+lng)) return;

      const visual = classifyLdnSoilFeature(props);
      const isSoil = props._mapped_dep !== undefined || props.dep !== undefined;
      const isHotspot = visual.label.includes("Hotspot") || visual.label.includes("Vulnerable");
      const isBrightSpot = visual.label.includes("Bright") || visual.label.includes("Fertile");

      const marker = Leaflet.marker([lat, lng], {
        icon: createPinIcon(Leaflet, visual),
      });

      const title = isSoil ? "Soil Sample" : "LDN Assessment";
      const badgeClass = isHotspot ? "hotspot" : isBrightSpot ? "brightspot" : "";
      const badgeHtml = badgeClass
        ? `<div class="popup-badge ${badgeClass}">${visual.label}</div>`
        : "";

      let rowsHtml = "";
      if (isSoil) {
        const mTex = props._mapped_tex || props.tex || props.texture;
        const mDep = props._mapped_dep || props.dep || props.depth_cm || props.depth;
        const mDist = props._mapped_dist || props.dist || props.district;
        const mWard = props.ward;
        const mTeam = props.team;
        const mLoc = props._mapped_loc || props.samloc || props.sample_position;
        const mMoist = props._mapped_moist || props.moisture;
        const mCol = props._mapped_col || props.col || props.munsell_color;
        const mCeid = props.ceid;

        if (mLoc) rowsHtml += `<div class="popup-row"><span class="popup-key">Position/Site</span><span class="popup-val" style="color:#fbbf24">${mLoc}</span></div>`;
        if (mDist) rowsHtml += `<div class="popup-row"><span class="popup-key">District</span><span class="popup-val">${mDist}</span></div>`;
        if (mWard) rowsHtml += `<div class="popup-row"><span class="popup-key">Ward</span><span class="popup-val">${mWard}</span></div>`;
        if (mTeam) rowsHtml += `<div class="popup-row"><span class="popup-key">Team</span><span class="popup-val">${mTeam}</span></div>`;
        if (mCeid) rowsHtml += `<div class="popup-row"><span class="popup-key">CEID</span><span class="popup-val">${mCeid}</span></div>`;
        if (mTex) rowsHtml += `<div class="popup-row"><span class="popup-key">Texture</span><span class="popup-val">${mTex}</span></div>`;
        if (mDep) rowsHtml += `<div class="popup-row"><span class="popup-key">Depth</span><span class="popup-val">${mDep} cm</span></div>`;
        if (mMoist) rowsHtml += `<div class="popup-row"><span class="popup-key">Moisture</span><span class="popup-val">${mMoist}</span></div>`;
        if (mCol) rowsHtml += `<div class="popup-row"><span class="popup-key">Color</span><span class="popup-val">${mCol}</span></div>`;
      } else {
        const mDist = props.dist || props.district;
        const mWard = props.ward;
        const mTeam = props.team;
        const mCeid = props.ceid;
        const mLanduse = props.landus || props.land_use || props.land_cover || props["ldi/tree"];
        const mSev = props.sev || props.severity || props["ldi/sev"];
        const mVeg = props.veg_cover || props["ldi/veg_cov"];
        const mErosion = props.erosion_signs || props.oth;

        if (mDist) rowsHtml += `<div class="popup-row"><span class="popup-key">District</span><span class="popup-val">${mDist}</span></div>`;
        if (mWard) rowsHtml += `<div class="popup-row"><span class="popup-key">Ward</span><span class="popup-val">${mWard}</span></div>`;
        if (mTeam) rowsHtml += `<div class="popup-row"><span class="popup-key">Survey Team</span><span class="popup-val">${mTeam}</span></div>`;
        if (mCeid) rowsHtml += `<div class="popup-row"><span class="popup-key">CEID</span><span class="popup-val">${mCeid}</span></div>`;
        if (mLanduse) rowsHtml += `<div class="popup-row"><span class="popup-key">Land Cover/Use</span><span class="popup-val">${mLanduse}</span></div>`;
        if (mSev) rowsHtml += `<div class="popup-row"><span class="popup-key">Degradation Severity</span><span class="popup-val" style="color:#fb7185">${mSev}</span></div>`;
        if (mVeg) rowsHtml += `<div class="popup-row"><span class="popup-key">Veg Cover</span><span class="popup-val">${mVeg}</span></div>`;
        if (mErosion) rowsHtml += `<div class="popup-row"><span class="popup-key">Erosion/Notes</span><span class="popup-val">${mErosion}</span></div>`;
      }

      const photoUrl = props.photo_url || props.thumb_url || props.photo_1_url;
      const photoHtml = photoUrl
        ? `<div style="width:100%; height:120px; border-radius:8px; overflow:hidden; margin-bottom:8px; background:#0f172a;">
             <img src="/api/media?url=${encodeURIComponent(photoUrl)}" style="width:100%; height:100%; object-fit:cover;" alt="Field Photo" />
           </div>`
        : "";

      marker.bindPopup(
        `${photoHtml}<div class="popup-title">${visual.icon} ${title}</div>${badgeHtml}${rowsHtml}`,
        { maxWidth: 280 }
      );

      marker.on("click", () => {
        if (onSelect && props._id != null) {
          onSelect(props._id);
        }
      });

      cluster.addLayer(marker);
      bounds.extend([lat, lng]);
      markerCount += 1;

      if (props._id != null) {
        markersRef.current[String(props._id)] = { marker, lat, lng };
      }
    });

    if (bounds.isValid() && markerCount > 0 && !hasFitBoundsRef.current) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
      hasFitBoundsRef.current = true;
      skipNextFocusRef.current = true;
    } else if (markerCount === 0) {
      hasFitBoundsRef.current = false;
    }
  }, [geojson, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !clusterRef.current || !activeId) return;
    if (skipNextFocusRef.current) {
      skipNextFocusRef.current = false;
      return;
    }

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
          width: isLegendCollapsed ? "auto" : "200px",
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
          <span>{mode === "ldn" ? "LDN Legend" : mode === "soil" ? "Soil Legend" : "Map Markers"}</span>
          <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: "12px" }}>
            {isLegendCollapsed ? "▲ Expand" : "▼ Collapse"}
          </span>
        </div>
        {!isLegendCollapsed && (
          <>
            <div className="legend-list">
              {legendItems.map((item, idx) => (
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
