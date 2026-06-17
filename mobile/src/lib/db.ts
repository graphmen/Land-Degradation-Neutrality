const DB_NAME = "ema_telemetry_db";
const DB_VERSION = 2;

export interface LdnDraft {
  id: string; // unique draft ID (timestamp or uuid)
  measurement_date: string;
  dist: string;
  ward: string;
  Team: string;
  GPS: string; // "lat lng alt acc"
  ceid: string;
  landcov: string;
  landus: string;
  use_spec?: string;
  lndmat: string;
  ex_mism?: string;
  veg_cov: string;
  signs_ero: string[]; // select_multiple
  tree?: string[]; // select_multiple
  sev: string;
  oth?: string;
  im?: string; // base64 photo
  synced: boolean;
  createdAt: number;
}

export interface SoilCoreDraft {
  samloc: string;
  poin: string; // "lat lng alt acc"
  dep: number;
  moisture: string;
  col: string;
  tex: string;
}

export interface SoilDraft {
  id: string;
  measurement_date: string;
  dist: string;
  ward: string;
  Team: string;
  ceid: string;
  cores: SoilCoreDraft[]; // repeatable list of cores
  synced: boolean;
  createdAt: number;
}

export interface DrylandsDraft {
  id: string; // unique draft ID
  date_of_observation: string;
  enumerator_name: string;
  ward_name: string;
  village_location: string;
  coordinates: string; // "lat lng alt acc"
  area_type: string[];
  area_type_other?: string;
  dominant_soil_type: string;
  dominant_soil_type_other?: string;
  distance_to_river: number;
  distance_to_wetland: number;
  distance_to_road: number;
  vegetation_condition: string;
  vegetation_description?: string;
  estimated_vegetation_cover: number;
  invasive_species_present: string; // Yes/No
  invasive_species_name?: string;
  current_land_cover_types: string[];
  current_land_cover_other?: string;
  soil_erosion_present: string; // Yes/No
  type_of_erosion: string[];
  erosion_severity: string;
  gully_dimensions?: string;
  erosion_expanding: string; // Yes/No
  assets_threatened: string[];
  assets_threatened_other?: string;
  water_sources_present: string[];
  water_sources_other?: string;
  water_quality_visual: string[];
  evidence_of_siltation: string; // Yes/No
  wetland_cultivation_observed: string; // Yes/No
  water_notes?: string;
  climate_change_indicators: string[];
  climate_change_other?: string;
  site_flood_prone: string; // Yes/No
  flood_notes?: string;
  evidence_of_recent_fire: string; // Yes/No
  fire_notes?: string;
  signs_of_drought_stress: string; // Yes/No
  drought_notes?: string;
  dominant_livelihoods: string[];
  livelihood_notes?: string;
  grazing_pressure: string[];
  grazing_notes?: string;
  observed_land_use_conflicts: string[];
  conflict_notes?: string;
  land_use_compatible: string; // Yes/No/Partially
  compatibility_explanation?: string;
  priority_level: string;
  priority_explanation?: string;
  recommended_interventions: string[];
  intervention_notes?: string;
  cost_category: string;
  cost_explanation?: string;
  photo_1?: string; // base64
  photo_2?: string; // base64
  photo_3?: string; // base64
  additional_notes?: string;
  synced: boolean;
  createdAt: number;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("ldn_drafts")) {
        db.createObjectStore("ldn_drafts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("soil_drafts")) {
        db.createObjectStore("soil_drafts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("drylands_drafts")) {
        db.createObjectStore("drylands_drafts", { keyPath: "id" });
      }
    };
  });
}

// --- LDN Draft Operations ---

export async function saveLdnDraft(draft: LdnDraft): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("ldn_drafts", "readwrite");
    const store = transaction.objectStore("ldn_drafts");
    const request = store.put(draft);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLdnDrafts(): Promise<LdnDraft[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("ldn_drafts", "readonly");
    const store = transaction.objectStore("ldn_drafts");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLdnDraft(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("ldn_drafts", "readwrite");
    const store = transaction.objectStore("ldn_drafts");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Soil Draft Operations ---

export async function saveSoilDraft(draft: SoilDraft): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("soil_drafts", "readwrite");
    const store = transaction.objectStore("soil_drafts");
    const request = store.put(draft);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSoilDrafts(): Promise<SoilDraft[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("soil_drafts", "readonly");
    const store = transaction.objectStore("soil_drafts");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSoilDraft(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("soil_drafts", "readwrite");
    const store = transaction.objectStore("soil_drafts");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Drylands Draft Operations ---

export async function saveDrylandsDraft(draft: DrylandsDraft): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drylands_drafts", "readwrite");
    const store = transaction.objectStore("drylands_drafts");
    const request = store.put(draft);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getDrylandsDrafts(): Promise<DrylandsDraft[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drylands_drafts", "readonly");
    const store = transaction.objectStore("drylands_drafts");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDrylandsDraft(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drylands_drafts", "readwrite");
    const store = transaction.objectStore("drylands_drafts");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLdnDraft(id: string): Promise<LdnDraft | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("ldn_drafts", "readonly");
    const store = transaction.objectStore("ldn_drafts");
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getSoilDraft(id: string): Promise<SoilDraft | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("soil_drafts", "readonly");
    const store = transaction.objectStore("soil_drafts");
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getDrylandsDraft(id: string): Promise<DrylandsDraft | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drylands_drafts", "readonly");
    const store = transaction.objectStore("drylands_drafts");
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
