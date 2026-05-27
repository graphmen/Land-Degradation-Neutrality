const DB_NAME = "ema_telemetry_db";
const DB_VERSION = 1;

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
