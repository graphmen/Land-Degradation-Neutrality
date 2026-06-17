import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ldnModPath = path.join(process.cwd(), "public", "ldn-modifications.json");
const ldnDataPath = path.join(process.cwd(), "public", "ldn-data.json");

export const dynamic = "force-dynamic";

const KOBO_URL = "https://kc.kobotoolbox.org/api/v1/data";
const KOBO_USER = process.env.KOBO_USERNAME || "vegris2020";
const KOBO_PASS = process.env.KOBO_PASSWORD || "musasa2020";
const AUTH = Buffer.from(`${KOBO_USER}:${KOBO_PASS}`).toString("base64");
const OFFLINE_MODE = process.env.OFFLINE_MODE !== "false"; // Defaults to true (offline), set to 'false' in production env vars for live sync
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// In-memory cache variables for Vercel warm starts
interface CacheData {
  records: any[];
  source: string;
  timestamp: number;
}
let ldnCache: CacheData | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 2500, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function normalise(record: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(record)) {
    out[k] = v;
    if (k.includes("/") && !k.startsWith("_")) {
      const short = k.split("/").pop()!;
      if (!(short in out)) out[short] = v;
    }
  }
  return out;
}

async function loadLocalFallback() {
  try {
    const raw = await fs.readFile(ldnDataPath, "utf-8");
    const json = JSON.parse(raw);
    const records = (json.records || []).map(normalise);
    return {
      count: records.length,
      records: records,
      fallback: true
    };
  } catch (err: any) {
    console.error("Local fallback load failed, using empty array:", err.message);
    return {
      count: 0,
      records: [],
      fallback: true
    };
  }
}

async function fetchLdnRawRecords(): Promise<{ records: any[]; source: string }> {
  let records: any[] = [];
  let source = "fallback";

  const isVercel = !!process.env.VERCEL;
  const isLocalBackend = BACKEND_URL.includes("localhost") || BACKEND_URL.includes("127.0.0.1");

  let backendFetched = false;

  // 1. Try FastAPI backend if it's not a local backend on Vercel
  if (!(isVercel && isLocalBackend)) {
    try {
      console.log(`Connecting to backend at: ${BACKEND_URL}/api/ldn`);
      const backendRes = await fetchWithTimeout(`${BACKEND_URL}/api/ldn`, {
        cache: "no-store",
        timeout: 2500,
      });
      if (backendRes.ok) {
        const json = await backendRes.json();
        records = json.records || [];
        source = "backend";
        backendFetched = true;
      } else {
        console.warn(`Backend returned status ${backendRes.status}. Falling back to direct Kobo API fetch...`);
      }
    } catch (backendErr: any) {
      console.warn(`Failed to connect to backend at ${BACKEND_URL}: ${backendErr.message}`);
    }
  }

  // 2. Direct Kobo API Fetch Fallback (if backend fetch was skipped or failed)
  if (!backendFetched) {
    try {
      console.log("Fetching forms list directly from Kobo...");
      const formsRes = await fetchWithTimeout(KOBO_URL, {
        headers: { Authorization: `Basic ${AUTH}` },
        cache: "no-store",
        timeout: 4000,
      });
      
      if (!formsRes.ok) {
        throw new Error(`KoboToolbox Error fetching forms: ${formsRes.status}`);
      }
      
      const forms = await formsRes.json();
      const targetForm = forms.find((f: any) => 
        (f.title && f.title.toLowerCase().includes("ldn validation form")) ||
        (f.id_string && f.id_string.toLowerCase().includes("ldn"))
      );

      if (!targetForm) {
        throw new Error("Could not find LDN validation form.");
      }

      console.log(`Fetching form data from Kobo for form: ${targetForm.title}`);
      const dataRes = await fetchWithTimeout(targetForm.url, {
        headers: { Authorization: `Basic ${AUTH}` },
        cache: "no-store",
        timeout: 6000,
      });

      if (!dataRes.ok) {
        throw new Error(`KoboToolbox Error fetching data: ${dataRes.status}`);
      }

      const json = await dataRes.json();
      const rawRecords = Array.isArray(json) ? json : (json.results || []);
      records = rawRecords.map(normalise);
      source = "kobotoolbox";
    } catch (e: any) {
      console.warn(`Direct Kobo fetch failed: ${e.message}. Falling back to local data file.`);
      const fallback = await loadLocalFallback();
      records = fallback.records;
      source = "fallback";
    }
  }

  // 3. Fetch and merge Google Sheets data
  const gsUrl = process.env.GOOGLE_SHEET_SCRIPT_URL;
  if (gsUrl) {
    try {
      console.log(`Connecting to Google Sheets script at: ${gsUrl}`);
      const gsRes = await fetchWithTimeout(gsUrl, {
        cache: "no-store",
        timeout: 4000,
      });
      if (gsRes.ok) {
        const gsJson = await gsRes.json();
        const sheetRecords = (gsJson.ldn || []).map(normalise);
        
        const seenIds = new Set(records.map((r: any) => String(r._id || r.id)));
        for (const sr of sheetRecords) {
          const srid = String(sr.id || sr._id || `sheet_ldn_${Date.now()}`);
          if (!seenIds.has(srid)) {
            records.push(sr);
            seenIds.add(srid);
          }
        }
      }
    } catch (err: any) {
      console.warn(`Could not fetch Google Sheets data in Next.js route: ${err.message}`);
    }
  }

  return { records, source };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const bypassCache = searchParams.get("bypassCache") === "true" || searchParams.get("sync") === "true";
  
  if (action === "modifications") {
    const mod = await loadLdnModifications();
    return NextResponse.json(mod);
  }

  let records: any[] = [];
  let source = "fallback";
  
  const mod = await loadLdnModifications();

  if (OFFLINE_MODE) {
    try {
      const fallback = await loadLocalFallback();
      records = fallback.records;
      source = "fallback";
    } catch (fsErr: any) {
      return NextResponse.json({ count: 0, records: [], error: `Local fallback failed: ${fsErr.message}` }, { status: 500 });
    }
  } else {
    // Check cache first
    const now = Date.now();
    if (!bypassCache && ldnCache && (now - ldnCache.timestamp < CACHE_TTL)) {
      records = ldnCache.records;
      source = ldnCache.source;
      console.log(`Serving LDN records from cache (age: ${Math.round((now - ldnCache.timestamp) / 1000)}s)`);
    } else if (!bypassCache) {
      try {
        console.log("Cache expired. Fetching fresh LDN records from sources...");
        const fetched = await fetchLdnRawRecords();
        records = fetched.records;
        source = fetched.source;
        ldnCache = {
          records,
          source,
          timestamp: now
        };
        // Update local file with newly fetched raw records
        const newJson = {
          count: records.length,
          records: records
        };
        await fs.writeFile(ldnDataPath, JSON.stringify(newJson, null, 2), "utf-8");
      } catch (err: any) {
        console.warn(`Live LDN fetch failed: ${err.message}. Falling back to local data file.`);
        const fallback = await loadLocalFallback();
        records = fallback.records;
        source = "fallback_cache";
        ldnCache = {
          records,
          source,
          timestamp: now
        };
      }
    } else {
      // Force sync: Fetch directly from live sources
      const fetched = await fetchLdnRawRecords();
      records = fetched.records;
      source = fetched.source;
      ldnCache = {
        records,
        source,
        timestamp: now
      };
      
      // Update local file with newly fetched raw records
      try {
        const newJson = {
          count: records.length,
          records: records
        };
        await fs.writeFile(ldnDataPath, JSON.stringify(newJson, null, 2), "utf-8");
        console.log(`Updated local file public/ldn-data.json with ${records.length} records from direct sync`);
      } catch (err: any) {
        console.error("Failed to write updated direct sync records to local file:", err);
      }
      
      console.log(`Force-cached ${records.length} raw LDN records from source: ${source}`);
    }
  }

  // APPLY LOCAL OVERRIDES (Reconciliation)
  // 1. Filter out deleted records
  const deletionsSet = new Set(mod.deletions.map((id: any) => String(id)));
  let reconciledRecords = records.filter((r: any) => !deletionsSet.has(String(r._id)));

  // 2. Merge edits
  reconciledRecords = reconciledRecords.map((r: any) => {
    const rid = String(r._id);
    if (mod.edits[rid]) {
      return { ...r, ...mod.edits[rid], _localStatus: "modified" };
    }
    return r;
  });

  // 3. Append additions
  const seenIds = new Set(reconciledRecords.map((r: any) => String(r._id)));
  for (const add of mod.additions) {
    if (!seenIds.has(String(add._id))) {
      reconciledRecords.push({ ...add, _localStatus: "local" });
      seenIds.add(String(add._id));
    }
  }

  return NextResponse.json({
    count: reconciledRecords.length,
    records: reconciledRecords,
    source: source,
    modificationsCount: {
      additions: mod.additions.length,
      deletions: mod.deletions.length,
      edits: Object.keys(mod.edits).length
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mod = await loadLdnModifications();
    
    // Generate unique _id
    const newId = body._id || Math.floor(Math.random() * 900000000) + 100000000;
    const newRecord = {
      ...body,
      _id: newId,
      _submission_time: body._submission_time || new Date().toISOString()
    };
    
    mod.additions.push(newRecord);
    await saveLdnModifications(mod);
    await syncLocalDataFile(mod);
    
    return NextResponse.json({ success: true, record: newRecord });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body._id);
    if (!id) {
      return NextResponse.json({ success: false, error: "Record _id is required for edits" }, { status: 400 });
    }
    
    const mod = await loadLdnModifications();
    
    // Check if it's a locally added record
    const addedIndex = mod.additions.findIndex((r: any) => String(r._id) === id);
    if (addedIndex !== -1) {
      mod.additions[addedIndex] = { ...mod.additions[addedIndex], ...body };
    } else {
      // If it's a remote record, add to edits
      mod.edits[id] = { ...(mod.edits[id] || {}), ...body };
    }
    
    await saveLdnModifications(mod);
    await syncLocalDataFile(mod);
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    
    if (action === "revert") {
      const targetId = searchParams.get("id");
      if (!targetId) return NextResponse.json({ success: false, error: "id parameter is required to revert" }, { status: 400 });
      
      const mod = await loadLdnModifications();
      mod.deletions = mod.deletions.filter((id: any) => String(id) !== targetId);
      mod.additions = mod.additions.filter((r: any) => String(r._id) !== targetId);
      if (mod.edits[targetId]) {
        delete mod.edits[targetId];
      }
      
      await saveLdnModifications(mod);
      await syncLocalDataFile(mod);
      return NextResponse.json({ success: true });
    }
    
    if (action === "revertAll") {
      const mod = { additions: [], deletions: [], edits: {} };
      await saveLdnModifications(mod);
      await syncLocalDataFile(mod);
      return NextResponse.json({ success: true });
    }
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Record id parameter is required" }, { status: 400 });
    }
    
    const mod = await loadLdnModifications();
    const ids = id.split(",");
    
    for (const singleId of ids) {
      // Add to deletions list if not already there
      if (!mod.deletions.includes(singleId)) {
        mod.deletions.push(singleId);
      }
      
      // Remove from additions if it was added locally
      mod.additions = mod.additions.filter((r: any) => String(r._id) !== singleId);
      
      // Remove from edits if it was edited
      if (mod.edits[singleId]) {
        delete mod.edits[singleId];
      }
    }
    
    await saveLdnModifications(mod);
    await syncLocalDataFile(mod);
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// Helpers for modifications filesystem storage

async function loadLdnModifications() {
  try {
    const data = await fs.readFile(ldnModPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { additions: [], deletions: [], edits: {} };
  }
}

async function saveLdnModifications(mod: any) {
  await fs.writeFile(ldnModPath, JSON.stringify(mod, null, 2), "utf-8");
}

async function syncLocalDataFile(mod: any) {
  try {
    const rawData = await fs.readFile(ldnDataPath, "utf-8");
    const json = JSON.parse(rawData);
    const records = json.records || [];
    
    // Apply deletions
    const filteredRecords = records.filter((r: any) => !mod.deletions.includes(String(r._id)));
    
    // Apply edits
    const editedRecords = filteredRecords.map((r: any) => {
      const rid = String(r._id);
      if (mod.edits[rid]) {
        return { ...r, ...mod.edits[rid] };
      }
      return r;
    });
    
    // Apply additions
    const seenIds = new Set(editedRecords.map((r: any) => String(r._id)));
    for (const add of mod.additions) {
      if (!seenIds.has(String(add._id))) {
        editedRecords.push(add);
        seenIds.add(String(add._id));
      }
    }
    
    json.records = editedRecords;
    json.count = editedRecords.length;
    await fs.writeFile(ldnDataPath, JSON.stringify(json, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to sync ldn-data.json:", err);
  }
}
