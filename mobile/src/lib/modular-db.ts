import type { ModuleId, UniversalSubmission } from "./submission-envelope";

const MODULAR_DB_NAME = "ema_ldn_modular_db";
const MODULAR_DB_VERSION = 1;
const STORE_NAME = "submissions";

function openModularDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MODULAR_DB_NAME, MODULAR_DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "submission_id" });
        store.createIndex("module_id", "module_id", { unique: false });
        store.createIndex("sync_state", "sync_state", { unique: false });
      }
    };
  });
}

export async function saveModularSubmission(
  sub: UniversalSubmission
): Promise<void> {
  const db = await openModularDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      ...sub,
      updated_at: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listModularSubmissions(
  moduleId?: ModuleId
): Promise<UniversalSubmission[]> {
  const db = await openModularDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = moduleId
      ? store.index("module_id").getAll(moduleId)
      : store.getAll();
    req.onsuccess = () => {
      const rows = (req.result as UniversalSubmission[]) ?? [];
      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteModularSubmission(submissionId: string): Promise<void> {
  const db = await openModularDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(submissionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateModularSyncState(
  submissionId: string,
  sync_state: UniversalSubmission["sync_state"],
  sync_error?: string | null
): Promise<void> {
  const db = await openModularDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(submissionId);
    getReq.onsuccess = () => {
      const existing = getReq.result as UniversalSubmission | undefined;
      if (!existing) {
        resolve();
        return;
      }
      store.put({
        ...existing,
        sync_state,
        sync_error: sync_error ?? null,
        updated_at: new Date().toISOString(),
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
