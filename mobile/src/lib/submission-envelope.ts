export type ModuleId =
  | "so1_land_cover"
  | "so1_soil_soc"
  | "pressures"
  | "so4_interventions"
  | "drylands_ilup";

export interface GeoPoint {
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy_m?: number | null;
  captured_at?: string;
}

export interface SpatialGeometry {
  mode: "point" | "polygon";
  point?: GeoPoint | null;
  polygon?: {
    coordinates: Array<[number, number]>; // [lng, lat] GeoJSON order
    area_ha: number;
    perimeter_m: number;
    vertex_count: number;
  } | null;
}

export interface PhotoAttachment {
  id: string;
  caption?: string;
  mime: string;
  data_b64: string;
  captured_at: string;
}

export interface UniversalSubmission<TPayload = Record<string, unknown>> {
  submission_id: string;
  module_id: ModuleId;
  form_version: string;
  reporting_period: string;
  enumerator: {
    name: string;
    team: string;
  };
  location: {
    province: string;
    district: string;
    ward: string;
    site_name?: string;
  };
  geometry: SpatialGeometry;
  photos: PhotoAttachment[];
  payload: TPayload;
  governance: {
    data_tier: "field_verify" | "tier2_national";
    verification_status: "submitted";
    code_list_version: string;
    sensitivity: "standard" | "restricted";
  };
  sync_state: "draft" | "pending" | "synced" | "error";
  sync_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleDefinition {
  id: ModuleId;
  title: string;
  shortTitle: string;
  unccdTag: string;
  description: string;
  accentColor: string;
  supportsPolygon: boolean;
  restricted?: boolean;
}

/**
 * Central Mobile Module Registry.
 * Adding a future EMA module only requires registering a definition here + a form component.
 */
export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: "so1_land_cover",
    title: "Land Cover & Degradation",
    shortTitle: "LDN (SO1)",
    unccdTag: "SO1-1 / SO1-2",
    description: "UNCCD 7-class land cover, degradation severity, vegetation & photos",
    accentColor: "#4ade80",
    supportsPolygon: true,
  },
  {
    id: "so1_soil_soc",
    title: "Soil Core & Lab SOC",
    shortTitle: "Soil (SO1-3)",
    unccdTag: "SO1-3 Tier-2",
    description: "0–30 cm horizon depth, texture, moisture, Munsell color & lab ref",
    accentColor: "#38bdf8",
    supportsPolygon: false,
  },
  {
    id: "pressures",
    title: "Degradation Pressures",
    shortTitle: "Pressures",
    unccdTag: "Drivers / EMA",
    description: "Invasive species, illegal mining, gullies, deforestation & veld fires",
    accentColor: "#f59e0b",
    supportsPolygon: true,
    restricted: true,
  },
  {
    id: "so4_interventions",
    title: "Restoration & Bright Spots",
    shortTitle: "Restoration",
    unccdTag: "SO4 / SO5",
    description: "SLM counterbalancing, restored hectares, beneficiaries & finance",
    accentColor: "#60a5fa",
    supportsPolygon: true,
  },
  {
    id: "drylands_ilup",
    title: "Drylands & ILUP",
    shortTitle: "Drylands",
    unccdTag: "SO2 / SO3",
    description: "Drought stress, livelihoods, erosion & community resilience",
    accentColor: "#c084fc",
    supportsPolygon: false,
  },
];

export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Compute geodesic polygon area (hectares) and perimeter (meters) on WGS84
 * using spherical excess / equirectangular projection at mean latitude.
 */
export function computePolygonMetrics(coords: Array<[number, number]>): {
  area_ha: number;
  perimeter_m: number;
} {
  if (coords.length < 3) return { area_ha: 0, perimeter_m: 0 };

  const R = 6371000; // Earth radius in meters
  const rad = Math.PI / 180;
  const meanLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  const cosLat = Math.cos(meanLat * rad);

  const projected = coords.map(([lng, lat]) => ({
    x: lng * rad * R * cosLat,
    y: lat * rad * R,
  }));

  let area2 = 0;
  let perimeter = 0;
  for (let i = 0; i < projected.length; i++) {
    const curr = projected[i];
    const next = projected[(i + 1) % projected.length];
    area2 += curr.x * next.y - next.x * curr.y;
    perimeter += Math.hypot(next.x - curr.x, next.y - curr.y);
  }

  const areaSqM = Math.abs(area2) / 2;
  return {
    area_ha: Number((areaSqM / 10000).toFixed(3)),
    perimeter_m: Number(perimeter.toFixed(1)),
  };
}

export function isInsideZimbabwe(lat: number, lng: number): boolean {
  return lat >= -22.5 && lat <= -15.4 && lng >= 25.0 && lng <= 33.2;
}
