import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { cronCache } from "@/lib/cronCache";
import ldnDataStatic from "@/public/ldn-data.json";

const ldnModPath = path.join(process.cwd(), "public", "ldn-modifications.json");
const ldnDataPath = path.join(process.cwd(), "public", "ldn-data.json");

export const dynamic = "force-dynamic";

const KOBO_URL = "https://kc.kobotoolbox.org/api/v1/data";
const KOBO_V2_URL = "https://kf.kobotoolbox.org/api/v2";
const KOBO_USER = process.env.KOBO_USERNAME || "vegris2020";
const KOBO_PASS = process.env.KOBO_PASSWORD || "musasa2020";
const AUTH = Buffer.from(`${KOBO_USER}:${KOBO_PASS}`).toString("base64");
const IS_VERCEL = !!process.env.VERCEL;
const OFFLINE_MODE = IS_VERCEL ? false : process.env.OFFLINE_MODE !== "false";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

interface CacheData {
  records: any[];
  source: string;
  timestamp: number;
}
let ldnCache: CacheData | null = null;
const CACHE_TTL = IS_VERCEL ? 30 * 60 * 1000 : 5 * 60 * 1000;

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
    const rawRecords = (ldnDataStatic && (ldnDataStatic as any).records) ? (ldnDataStatic as any).records : [];
    const records = rawRecords.map(normalise);
    return {
      count: records.length,
      records: records,
      fallback: true
    };
  } catch (err: any) {
    try {
      const raw = await fs.readFile(ldnDataPath, "utf-8");
      const json = JSON.parse(raw);
      const records = (json.records || []).map(normalise);
      return { count: records.length, records: records, fallback: true };
    } catch (e2) {
      return { count: 0, records: [], fallback: true };
    }
  }
}

async function fetchLdnRawRecords(options: { forceLiveKobo?: boolean } = {}): Promise<{ records: any[]; source: string }> {
  const SUPABASE_URL = "https://pqfbcvxisrmtmhmuxbjk.supabase.co";
  const SUPABASE_KEY = Buffer.from("c2Jfc2VjcmV0X3pXVmVzZ0JnNU8zVU84WnVkUi1TQndfTXprQ0VuelI=", "base64").toString("utf-8");

  try {
    console.log("Fetching LDN records directly from Supabase...");
    let res = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/ldn_validations?select=*&limit=5000`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': 'ldn'
      },
      cache: "no-store",
      timeout: 8000
    });
    if (!res.ok) {
      res = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/ldn_validations?select=*&limit=5000`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        cache: "no-store",
        timeout: 8000
      });
    }
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const records = data.map(r => r.raw_data ? normalise(r.raw_data) : normalise(r));
        console.log(`Fetched ${records.length} LDN records from Supabase!`);
        return { records, source: "supabase" };
      }
    }
  } catch (err: any) {
    console.warn("Supabase fetch failed, trying local fallback:", err.message);
  }

  const fallback = await loadLocalFallback();
  return { records: fallback.records, source: "fallback" };
}

export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  
  if (action === "modifications") {
    const mod = await loadLdnModifications();
    return NextResponse.json(mod);
  }

  const mod = await loadLdnModifications();
  const fetched = await fetchLdnRawRecords();
  let records = fetched.records;
  const source = fetched.source;

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
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, max-age=0, s-maxage=0, must-revalidate"
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
