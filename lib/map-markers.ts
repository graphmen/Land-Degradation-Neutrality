export interface MarkerVisual {
  color: string;
  glow: string;
  icon: string;
  label: string;
}

export interface LegendItem {
  name: string;
  color: string;
  icon?: string;
}

const PIN_ICONS = {
  ldnHotspot: "⚠",
  ldnBright: "★",
  ldnBaseline: "🌿",
  soilHotspot: "🏜",
  soilBright: "✦",
  soilBaseline: "🧪",
  drylandsHigh: "!",
  drylandsMedium: "◆",
  drylandsLow: "✓",
  intWetland: "💧",
  intErosion: "⛰",
  intForest: "🌲",
  intGully: "⚡",
  intSlm: "♻",
  intCrop: "🌾",
  intDefault: "🛠",
} as const;

export function classifyLdnSoilFeature(props: Record<string, any>): MarkerVisual {
  const isSoil = props._mapped_dep !== undefined || props.dep !== undefined;
  let isHotspot = false;
  let isBrightSpot = false;

  if (isSoil) {
    const texture = String(props._mapped_tex || props.tex || "").toLowerCase();
    const moisture = String(props._mapped_moist || props.moisture || "").toLowerCase();
    if (texture.includes("sand") && moisture.includes("dry")) isHotspot = true;
    else if (texture.includes("loam") || texture.includes("silt")) isBrightSpot = true;
  } else {
    const severity = String(props.sev || "").toLowerCase();
    if (severity.includes("high") || severity.includes("severe") || severity.includes("critical")) {
      isHotspot = true;
    } else if (
      severity.includes("low") ||
      severity.includes("minimal") ||
      severity.includes("stable") ||
      severity.includes("none")
    ) {
      isBrightSpot = true;
    }
  }

  if (isSoil) {
    if (isHotspot) {
      return { color: "#e11d48", glow: "rgba(225,29,72,0.45)", icon: PIN_ICONS.soilHotspot, label: "Vulnerable Soil" };
    }
    if (isBrightSpot) {
      return { color: "#059669", glow: "rgba(5,150,105,0.45)", icon: PIN_ICONS.soilBright, label: "Fertile Soil" };
    }
    return { color: "#7c3aed", glow: "rgba(124,58,237,0.4)", icon: PIN_ICONS.soilBaseline, label: "Soil Sample" };
  }

  if (isHotspot) {
    return { color: "#dc2626", glow: "rgba(220,38,38,0.45)", icon: PIN_ICONS.ldnHotspot, label: "Degraded Hotspot" };
  }
  if (isBrightSpot) {
    return { color: "#16a34a", glow: "rgba(22,163,74,0.45)", icon: PIN_ICONS.ldnBright, label: "Bright Spot" };
  }
  return { color: "#2563eb", glow: "rgba(37,99,235,0.4)", icon: PIN_ICONS.ldnBaseline, label: "LDN Assessment" };
}

export function classifyDrylandsRecord(record: Record<string, any>): MarkerVisual {
  const priority = String(record.priority_level || "").toLowerCase();
  if (priority.includes("high")) {
    return { color: "#dc2626", glow: "rgba(220,38,38,0.45)", icon: PIN_ICONS.drylandsHigh, label: "High Priority" };
  }
  if (priority.includes("medium")) {
    return { color: "#d97706", glow: "rgba(217,119,6,0.45)", icon: PIN_ICONS.drylandsMedium, label: "Medium Priority" };
  }
  if (priority.includes("low")) {
    return { color: "#059669", glow: "rgba(5,150,105,0.45)", icon: PIN_ICONS.drylandsLow, label: "Low Priority" };
  }
  return { color: "#0284c7", glow: "rgba(2,132,199,0.4)", icon: "🏜", label: "Drylands Site" };
}

export function classifyInterventionRecord(record: Record<string, any>): MarkerVisual {
  const category = String(record.category || "").toLowerCase();
  if (category.includes("wetland")) {
    return { color: "#0284c7", glow: "rgba(2,132,199,0.4)", icon: PIN_ICONS.intWetland, label: "Wetland" };
  }
  if (category.includes("erosion")) {
    return { color: "#d97706", glow: "rgba(217,119,6,0.45)", icon: PIN_ICONS.intErosion, label: "Erosion Control" };
  }
  if (category.includes("forest") || category.includes("reforestation")) {
    return { color: "#166534", glow: "rgba(22,101,52,0.45)", icon: PIN_ICONS.intForest, label: "Reforestation" };
  }
  if (category.includes("gully")) {
    return { color: "#be123c", glow: "rgba(190,18,60,0.45)", icon: PIN_ICONS.intGully, label: "Gully Reclamation" };
  }
  if (category.includes("sustainable")) {
    return { color: "#65a30d", glow: "rgba(101,163,13,0.45)", icon: PIN_ICONS.intSlm, label: "SLM" };
  }
  if (category.includes("crop") || category.includes("cropland")) {
    return { color: "#10b981", glow: "rgba(16,185,129,0.45)", icon: PIN_ICONS.intCrop, label: "Cropland" };
  }
  return { color: "#006633", glow: "rgba(0,102,51,0.4)", icon: PIN_ICONS.intDefault, label: "Intervention" };
}

export function createPinIcon(Leaflet: any, visual: MarkerVisual, active = false) {
  const activeClass = active ? " data-marker-active" : "";
  return Leaflet.divIcon({
    className: "custom-data-marker-wrap",
    html: `
      <div class="data-marker${activeClass}" style="--m-color:${visual.color};--m-glow:${visual.glow}">
        <div class="data-marker-ring"></div>
        <div class="data-marker-body">
          <span class="data-marker-icon">${visual.icon}</span>
        </div>
        <div class="data-marker-pointer"></div>
      </div>
    `,
    iconSize: [24, 30],
    iconAnchor: [12, 30],
    popupAnchor: [0, -28],
  });
}

export function createMarkerClusterGroup(Leaflet: any) {
  if (typeof Leaflet.markerClusterGroup !== "function") {
    console.warn("leaflet.markercluster not loaded; falling back to feature group.");
    return Leaflet.featureGroup();
  }

  return Leaflet.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 52,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 15,
    animateAddingMarkers: true,
    iconCreateFunction: (cluster: any) => {
      const count = cluster.getChildCount();
      let sizeClass = "small";
      if (count >= 25) sizeClass = "large";
      else if (count >= 10) sizeClass = "medium";

      return Leaflet.divIcon({
        html: `<div class="marker-cluster-bubble marker-cluster-${sizeClass}"><span>${count}</span></div>`,
        className: "marker-cluster-custom-wrap",
        iconSize: Leaflet.point(44, 44),
      });
    },
  });
}

export async function loadLeafletWithCluster() {
  const leafletMod = await import("leaflet");
  const Leaflet = leafletMod.default || leafletMod;

  if (typeof window !== "undefined") {
    (window as any).L = Leaflet;
  }

  // Load after Leaflet is on window so the plugin attaches correctly.
  await import("leaflet.markercluster");

  return { Leaflet };
}

export function focusMarker(
  map: any,
  clusterGroup: any,
  marker: any,
  lat: number,
  lng: number,
  openPopup = true
) {
  if (typeof clusterGroup.zoomToShowLayer === "function") {
    clusterGroup.zoomToShowLayer(marker, () => {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 1.0 });
      if (openPopup) {
        setTimeout(() => marker.openPopup(), 300);
      }
    });
    return;
  }

  map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 1.0 });
  if (openPopup) {
    setTimeout(() => marker.openPopup(), 300);
  }
}

export function addBaseTileLayers(Leaflet: any, map: any) {
  const googleHybrid = Leaflet.tileLayer(
    "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    { attribution: "© Google Maps", maxZoom: 20 }
  ).addTo(map);

  const googleSatellite = Leaflet.tileLayer(
    "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    { attribution: "© Google Maps", maxZoom: 20 }
  );

  const googleStreets = Leaflet.tileLayer(
    "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    { attribution: "© Google Maps", maxZoom: 20 }
  );

  const googleTerrain = Leaflet.tileLayer(
    "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    { attribution: "© Google Maps", maxZoom: 20 }
  );

  const esriSatellite = Leaflet.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "© Esri • Esri World Imagery", maxZoom: 19 }
  );

  const darkTile = Leaflet.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { attribution: "© OpenStreetMap © CARTO", maxZoom: 19 }
  );

  Leaflet.control
    .layers(
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
    )
    .addTo(map);
}

export const LDN_LEGEND: LegendItem[] = [
  { name: "Degraded Hotspot", color: "#dc2626", icon: "⚠" },
  { name: "Restored Bright Spot", color: "#16a34a", icon: "★" },
  { name: "LDN Assessment", color: "#2563eb", icon: "🌿" },
];

export const SOIL_LEGEND: LegendItem[] = [
  { name: "Vulnerable Soil", color: "#e11d48", icon: "🏜" },
  { name: "Fertile Soil", color: "#059669", icon: "✦" },
  { name: "Soil Sample", color: "#7c3aed", icon: "🧪" },
];

export const LDN_SOIL_LEGEND: LegendItem[] = [...LDN_LEGEND, ...SOIL_LEGEND];

export const DRYLANDS_LEGEND: LegendItem[] = [
  { name: "High Priority", color: "#dc2626", icon: "!" },
  { name: "Medium Priority", color: "#d97706", icon: "◆" },
  { name: "Low Priority", color: "#059669", icon: "✓" },
];

export const INTERVENTIONS_LEGEND: LegendItem[] = [
  { name: "Wetland Protection", color: "#0284c7", icon: "💧" },
  { name: "Erosion Control", color: "#d97706", icon: "⛰" },
  { name: "Forest Reforestation", color: "#166534", icon: "🌲" },
  { name: "Gully Reclamation", color: "#be123c", icon: "⚡" },
  { name: "Sustainable Land Mgmt", color: "#65a30d", icon: "♻" },
  { name: "Conservation Cropland", color: "#10b981", icon: "🌾" },
];
