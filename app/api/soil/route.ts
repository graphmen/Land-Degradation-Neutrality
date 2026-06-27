import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { cronCache } from "@/lib/cronCache";

const soilModPath = path.join(process.cwd(), "public", "soil-modifications.json");
const soilDataPath = path.join(process.cwd(), "public", "soil-data.json");

export const dynamic = "force-dynamic";

const KOBO_URL = "https://kc.kobotoolbox.org/api/v1/data";
const KOBO_V2_URL = "https://kf.kobotoolbox.org/api/v2";
const KOBO_USER = process.env.KOBO_USERNAME || "vegris2020";
const KOBO_PASS = process.env.KOBO_PASSWORD || "musasa2020";
const AUTH = Buffer.from(`${KOBO_USER}:${KOBO_PASS}`).toString("base64");
// On Vercel: always fetch live from Kobo. Locally: respect OFFLINE_MODE env var.
const IS_VERCEL = !!process.env.VERCEL;
const OFFLINE_MODE = IS_VERCEL ? false : process.env.OFFLINE_MODE !== "false";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// In-memory cache — module-level so it persists across warm serverless invocations
interface CacheData {
  records: any[];
  source: string;
  timestamp: number;
}
let soilCache: CacheData | null = null;
// On Vercel: 30 min TTL (reduce cold-start Kobo calls). Locally: 5 min for dev freshness.
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
    const raw = await fs.readFile(soilDataPath, "utf-8");
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

async function fetchSoilRawRecords(options: { forceLiveKobo?: boolean } = {}): Promise<{ records: any[]; source: string }> {
  let records: any[] = [];
  let source = "fallback";

  const isVercel = !!process.env.VERCEL;
  const isLocalBackend = BACKEND_URL.includes("localhost") || BACKEND_URL.includes("127.0.0.1");

  let backendFetched = false;

  const tryBackend = async () => {
    if (isVercel && isLocalBackend) return false;
    try {
      console.log(`Connecting to backend at: ${BACKEND_URL}/api/soil`);
      const backendRes = await fetchWithTimeout(`${BACKEND_URL}/api/soil`, {
        cache: "no-store",
        timeout: 30000,
      });
      if (backendRes.ok) {
        const json = await backendRes.json();
        records = json.records || [];
        source = "backend";
        return true;
      }
      console.warn(`Backend returned status ${backendRes.status}. Falling back to direct Kobo API fetch...`);
    } catch (backendErr: any) {
      console.warn(`Failed to connect to backend at ${BACKEND_URL}: ${backendErr.message}`);
    }
    return false;
  };

  // 1. Try FastAPI backend first for normal reads; sync tries Kobo direct first
  if (!options.forceLiveKobo) {
    backendFetched = await tryBackend();
  }

  // 2. Direct Kobo API fetch (if backend fetch was skipped or failed)
  if (!backendFetched) {
    try {
      const assetIds = ["am3UGrEY8tYcnrMp3Xddys", "ahkCvpctsofMKN4GzCH3BT"];
      console.log("Fetching soil records directly from Kobo v2 API...");
      
      const koboRecords: any[] = [];
      for (const assetId of assetIds) {
        try {
          const url = `${KOBO_V2_URL}/assets/${assetId}/data/?format=json&limit=5000`;
          const dataRes = await fetchWithTimeout(url, {
            headers: { Authorization: `Basic ${AUTH}` },
            cache: "no-store",
            timeout: 30000,
          });
          if (dataRes.ok) {
            const json = await dataRes.json();
            const rawRecords = json.results || [];
            console.log(`Successfully fetched ${rawRecords.length} records for form ${assetId}`);
            koboRecords.push(...rawRecords);
          } else {
            console.warn(`Kobo v2 fetch for form ${assetId} failed with status ${dataRes.status}`);
          }
        } catch (err: any) {
          console.warn(`Kobo v2 fetch for form ${assetId} failed: ${err.message}`);
        }
      }
      
      if (koboRecords.length > 0) {
        // Deduplicate and normalise
        const seenIds = new Set();
        records = [];
        for (const r of koboRecords) {
          const rid = String(r._id || r.id || "");
          if (rid) {
            if (seenIds.has(rid)) continue;
            seenIds.add(rid);
          }
          records.push(normalise(r));
        }
        source = "kobotoolbox";
        backendFetched = true;
      } else {
        throw new Error("No records could be retrieved from Kobo v2 API.");
      }
    } catch (e: any) {
      console.warn(`Direct Kobo fetch failed: ${e.message}. Trying backend/local fallback...`);
      if (options.forceLiveKobo && (await tryBackend())) {
        backendFetched = true;
      } else {
        const fallback = await loadLocalFallback();
        records = fallback.records;
        source = "fallback";
        backendFetched = true;
      }
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
        const sheetRecords = (gsJson.soil || []).map(normalise);
        
        const seenIds = new Set(records.map((r: any) => String(r._id || r.id)));
        for (const sr of sheetRecords) {
          const srid = String(sr.id || sr._id || `sheet_soil_${Date.now()}`);
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
    const mod = await loadSoilModifications();
    return NextResponse.json(mod);
  }

  let records: any[] = [];
  let source = "fallback";
  
  const mod = await loadSoilModifications();

  // On Vercel: always go live (OFFLINE_MODE is forced false). Locally: respect OFFLINE_MODE.
  if (OFFLINE_MODE && !bypassCache) {
    try {
      const fallback = await loadLocalFallback();
      records = fallback.records;
      source = "fallback";
    } catch (fsErr: any) {
      return NextResponse.json({ count: 0, records: [], error: `Local fallback failed: ${fsErr.message}` }, { status: 500 });
    }
  } else {
    // Check cron cache first (populated by /api/cron/sync on Vercel)
    const now = Date.now();
    let cronRecords: any[] | null = null;
    try {
      if (cronCache?.soil && (now - cronCache.soil.updatedAt < CACHE_TTL)) {
        cronRecords = cronCache.soil.records;
        console.log(`[Soil] Serving from cron cache (age: ${Math.round((now - cronCache.soil.updatedAt) / 1000)}s)`);
      }
    } catch {}

    if (cronRecords) {
      records = cronRecords;
      source = "cron-cache";
    } else if (!bypassCache && soilCache && (now - soilCache.timestamp < CACHE_TTL)) {
      records = soilCache.records;
      source = soilCache.source;
      console.log(`Serving Soil records from cache (age: ${Math.round((now - soilCache.timestamp) / 1000)}s)`);
    } else if (!bypassCache) {
      try {
        console.log("Cache expired. Fetching fresh Soil records from sources...");
        const fetched = await fetchSoilRawRecords();
        records = fetched.records;
        source = fetched.source;
        soilCache = {
          records,
          source,
          timestamp: now
        };
        // Update local file with newly fetched raw records
        const newJson = {
          count: records.length,
          records: records
        };
        await fs.writeFile(soilDataPath, JSON.stringify(newJson, null, 2), "utf-8");
      } catch (err: any) {
        console.warn(`Live Soil fetch failed: ${err.message}. Falling back to local data file.`);
        const fallback = await loadLocalFallback();
        records = fallback.records;
        source = "fallback_cache";
        soilCache = {
          records,
          source,
          timestamp: now
        };
      }
    } else {
      // Force sync: fetch directly from Kobo Collect (skip backend cache)
      const fetched = await fetchSoilRawRecords({ forceLiveKobo: true });
      records = fetched.records;
      source = fetched.source;
      soilCache = {
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
        await fs.writeFile(soilDataPath, JSON.stringify(newJson, null, 2), "utf-8");
        console.log(`Updated local file public/soil-data.json with ${records.length} records from direct sync`);
      } catch (err: any) {
        console.error("Failed to write updated direct sync records to local file:", err);
      }
      
      console.log(`Force-cached ${records.length} raw Soil records from source: ${source}`);
    }
  }

  // Merge Soil Organic Carbon data on the fly from public/soil-organic-carbon.json
  try {
    const socPath = path.join(process.cwd(), "public", "soil-organic-carbon.json");
    const socRaw = await fs.readFile(socPath, "utf-8").catch(() => null);
    if (socRaw) {
      const socMapping = JSON.parse(socRaw);
      records = records.map((r: any) => {
        const ceid = r["geninfo/ceid"] || r.ceid;
        if (ceid && socMapping[ceid]) {
          const ocList = socMapping[ceid];
          const updatedRecord = { ...r };
          if (Array.isArray(updatedRecord.sampl)) {
            updatedRecord.sampl = updatedRecord.sampl.map((s: any, idx: number) => {
              if (idx < ocList.length) {
                return {
                  ...s,
                  lab_number: ocList[idx].lab_number,
                  "sampl/lab_number": ocList[idx].lab_number,
                  organic_carbon: ocList[idx].organic_carbon,
                  "sampl/organic_carbon": ocList[idx].organic_carbon,
                  sample_ref: ocList[idx].sample_ref,
                  "sampl/sample_ref": ocList[idx].sample_ref
                };
              }
              return s;
            });
          }
          return updatedRecord;
        }
        return r;
      });
    }
  } catch (err) {
    console.error("Failed to merge soil organic carbon data dynamically in API route:", err);
  }

  // APPLY LOCAL OVERRIDES (Reconciliation for Soil)
  const deletionsSet = new Set(mod.deletions.map((id: any) => String(id)));
  const editsMap = mod.edits || {};
  const parentEditsMap = mod.parentEdits || {};
  
  let reconciledRecords = [...records];
  const seenIds = new Set(reconciledRecords.map(r => String(r._id)));
  
  for (const add of mod.additions || []) {
    if (!seenIds.has(String(add._id))) {
      reconciledRecords.push(add);
      seenIds.add(String(add._id));
    }
  }
  
  // Filter out parent deletions
  reconciledRecords = reconciledRecords.filter(r => !deletionsSet.has(String(r._id)));
  
  // Apply parent-level edits and sub-sample overrides
  reconciledRecords = reconciledRecords.map(r => {
    const pid = String(r._id);
    let updatedRecord = { ...r };
    
    // Apply parent-level edits
    if (parentEditsMap[pid]) {
      updatedRecord = { ...updatedRecord, ...parentEditsMap[pid], _localStatus: "modified" };
    }
    
    // Apply sub-sample overrides (edits & deletions)
    if (Array.isArray(updatedRecord.sampl)) {
      let isAnyChildEdited = false;
      
      updatedRecord.sampl = updatedRecord.sampl
        .map((s: any, idx: number) => {
          const flatId = `${pid}_${idx}`;
          if (editsMap[flatId]) {
            isAnyChildEdited = true;
            const subEdits = editsMap[flatId];
            const updatedSample = { ...s };
            if ("tex" in subEdits) updatedSample["sampl/tex"] = subEdits.tex;
            if ("moisture" in subEdits) updatedSample["sampl/moisture"] = subEdits.moisture;
            if ("dep" in subEdits) updatedSample["sampl/dep"] = subEdits.dep;
            if ("samloc" in subEdits) updatedSample["sampl/samloc"] = subEdits.samloc;
            if ("poin" in subEdits) updatedSample["sampl/poin"] = subEdits.poin;
            updatedSample._localStatus = "modified";
            return updatedSample;
          }
          return s;
        })
        .filter((s: any, idx: number) => {
          const flatId = `${pid}_${idx}`;
          return !deletionsSet.has(flatId);
        });
        
      if (isAnyChildEdited && !updatedRecord._localStatus) {
        updatedRecord._localStatus = "modified";
      }
    }
    
    // Mark as local if it was added locally
    const addedIndex = (mod.additions || []).findIndex((add: any) => String(add._id) === pid);
    if (addedIndex !== -1) {
      updatedRecord._localStatus = "local";
      if (Array.isArray(updatedRecord.sampl)) {
        updatedRecord.sampl = updatedRecord.sampl.map((s: any) => ({ ...s, _localStatus: "local" }));
      }
    }
    
    return updatedRecord;
  });
  
  // Remove parent records with no samples left
  reconciledRecords = reconciledRecords.filter(r => !Array.isArray(r.sampl) || r.sampl.length > 0);

  return NextResponse.json({
    count: reconciledRecords.length,
    records: reconciledRecords,
    source: source,
    modificationsCount: {
      additions: mod.additions.length,
      deletions: mod.deletions.length,
      edits: Object.keys(mod.edits).length + Object.keys(mod.parentEdits).length
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mod = await loadSoilModifications();
    
    const newParentId = body._id || Math.floor(Math.random() * 900000000) + 100000000;
    
    const newRecord = {
      _id: newParentId,
      "formhub/uuid": "db3dc5dc018a41e0acba6a9e0874eb68",
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      today: new Date().toISOString().split("T")[0],
      deviceid: "collect:custom_agent",
      "geninfo/measurement_date": body["geninfo/measurement_date"] || new Date().toISOString().split("T")[0],
      "geninfo/dist": body["geninfo/dist"] || body.dist || "Unspecified",
      "geninfo/ward": body["geninfo/ward"] || body.ward || "1",
      "geninfo/Team": body["geninfo/Team"] || body.agent || "Admin",
      "geninfo/ceid": body["geninfo/ceid"] || body.ceid || "custom_point",
      _submission_time: new Date().toISOString(),
      sampl: [
        {
          "sampl/samloc": body["sampl/samloc"] || body.samloc || "cent",
          "sampl/dep": body["sampl/dep"] || body.dep || "30",
          "sampl/moisture": body["sampl/moisture"] || body.moisture || "No",
          "sampl/tex": body["sampl/tex"] || body.tex || "sand",
          "sampl/poin": body["sampl/poin"] || body.poin || `${body.lat || -19.9} ${body.lng || 32.2} 0 0`
        }
      ]
    };
    
    mod.additions.push(newRecord);
    await saveSoilModifications(mod);
    await syncLocalSoilDataFile(mod);
    
    return NextResponse.json({ success: true, record: newRecord });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const flatId = String(body._id);
    if (!flatId) {
      return NextResponse.json({ success: false, error: "Record _id is required for edits" }, { status: 400 });
    }
    
    const mod = await loadSoilModifications();
    
    if (flatId.includes("_")) {
      const [pid, idxStr] = flatId.split("_");
      const idx = parseInt(idxStr);
      
      const parentFields: any = {};
      if (body["geninfo/dist"] || body.dist) parentFields["geninfo/dist"] = body["geninfo/dist"] || body.dist;
      if (body["geninfo/ward"] || body.ward) parentFields["geninfo/ward"] = body["geninfo/ward"] || body.ward;
      if (body["geninfo/Team"] || body.agent) parentFields["geninfo/Team"] = body["geninfo/Team"] || body.agent;
      if (body["geninfo/ceid"] || body.ceid) parentFields["geninfo/ceid"] = body["geninfo/ceid"] || body.ceid;
      
      const childFields: any = {};
      if (body["sampl/tex"] || body.tex) childFields.tex = body["sampl/tex"] || body.tex;
      if (body["sampl/moisture"] || body.moisture) childFields.moisture = body["sampl/moisture"] || body.moisture;
      if (body["sampl/dep"] || body.dep) childFields.dep = body["sampl/dep"] || body.dep;
      if (body["sampl/samloc"] || body.samloc) childFields.samloc = body["sampl/samloc"] || body.samloc;
      if (body["sampl/poin"] || body.poin) childFields.poin = body["sampl/poin"] || body.poin;
      
      const addedIdx = mod.additions.findIndex((r: any) => String(r._id) === pid);
      if (addedIdx !== -1) {
        const record = mod.additions[addedIdx];
        mod.additions[addedIdx] = { ...record, ...parentFields };
        if (Array.isArray(record.sampl) && record.sampl[idx]) {
          const s = record.sampl[idx];
          const updatedSample = { ...s };
          if (childFields.tex) updatedSample["sampl/tex"] = childFields.tex;
          if (childFields.moisture) updatedSample["sampl/moisture"] = childFields.moisture;
          if (childFields.dep) updatedSample["sampl/dep"] = childFields.dep;
          if (childFields.samloc) updatedSample["sampl/samloc"] = childFields.samloc;
          if (childFields.poin) updatedSample["sampl/poin"] = childFields.poin;
          mod.additions[addedIdx].sampl[idx] = updatedSample;
        }
      } else {
        if (Object.keys(parentFields).length > 0) {
          mod.parentEdits[pid] = { ...(mod.parentEdits[pid] || {}), ...parentFields };
        }
        if (Object.keys(childFields).length > 0) {
          mod.edits[flatId] = { ...(mod.edits[flatId] || {}), ...childFields };
        }
      }
    } else {
      const pid = flatId;
      const addedIdx = mod.additions.findIndex((r: any) => String(r._id) === pid);
      if (addedIdx !== -1) {
        mod.additions[addedIdx] = { ...mod.additions[addedIdx], ...body };
      } else {
        mod.parentEdits[pid] = { ...(mod.parentEdits[pid] || {}), ...body };
      }
    }
    
    await saveSoilModifications(mod);
    await syncLocalSoilDataFile(mod);
    
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
      
      const mod = await loadSoilModifications();
      mod.deletions = mod.deletions.filter((d: any) => String(d) !== targetId);
      mod.additions = mod.additions.filter((r: any) => String(r._id) !== targetId);
      if (mod.edits[targetId]) delete mod.edits[targetId];
      if (mod.parentEdits[targetId]) delete mod.parentEdits[targetId];
      
      await saveSoilModifications(mod);
      await syncLocalSoilDataFile(mod);
      return NextResponse.json({ success: true });
    }
    
    if (action === "revertAll") {
      const mod = { additions: [], deletions: [], edits: {}, parentEdits: {} };
      await saveSoilModifications(mod);
      await syncLocalSoilDataFile(mod);
      return NextResponse.json({ success: true });
    }
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Record id parameter is required" }, { status: 400 });
    }
    
    const mod = await loadSoilModifications();
    const ids = id.split(",");
    
    for (const singleId of ids) {
      if (!mod.deletions.includes(singleId)) {
        mod.deletions.push(singleId);
      }
      
      if (singleId.includes("_")) {
        const [pid, idxStr] = singleId.split("_");
        const idx = parseInt(idxStr);
        const addedIdx = mod.additions.findIndex((r: any) => String(r._id) === pid);
        if (addedIdx !== -1) {
          const record = mod.additions[addedIdx];
          if (Array.isArray(record.sampl)) {
            record.sampl.splice(idx, 1);
            if (record.sampl.length === 0) {
              mod.additions = mod.additions.filter((r: any) => String(r._id) !== pid);
            }
          }
        }
      } else {
        mod.additions = mod.additions.filter((r: any) => String(r._id) !== singleId);
        if (mod.parentEdits[singleId]) delete mod.parentEdits[singleId];
      }
      
      if (mod.edits[singleId]) delete mod.edits[singleId];
    }
    
    await saveSoilModifications(mod);
    await syncLocalSoilDataFile(mod);
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// Helpers for modifications filesystem storage

async function loadSoilModifications() {
  try {
    const data = await fs.readFile(soilModPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { additions: [], deletions: [], edits: {}, parentEdits: {} };
  }
}

async function saveSoilModifications(mod: any) {
  await fs.writeFile(soilModPath, JSON.stringify(mod, null, 2), "utf-8");
}

async function syncLocalSoilDataFile(mod: any) {
  try {
    const rawData = await fs.readFile(soilDataPath, "utf-8");
    const json = JSON.parse(rawData);
    const records = json.records || [];
    
    let reconciled = [...records];
    const seenIds = new Set(reconciled.map(r => String(r._id)));
    for (const add of mod.additions || []) {
      if (!seenIds.has(String(add._id))) {
        reconciled.push(add);
        seenIds.add(String(add._id));
      }
    }
    
    reconciled = reconciled.filter(r => !mod.deletions.includes(String(r._id)));
    
    reconciled = reconciled.map(r => {
      const pid = String(r._id);
      let updated = { ...r };
      if (mod.parentEdits[pid]) {
        updated = { ...updated, ...mod.parentEdits[pid] };
      }
      if (Array.isArray(updated.sampl)) {
        updated.sampl = updated.sampl
          .map((s: any, idx: number) => {
            const flatId = `${pid}_${idx}`;
            if (mod.edits[flatId]) {
              const subEdits = mod.edits[flatId];
              const updatedSample = { ...s };
              if ("tex" in subEdits) updatedSample["sampl/tex"] = subEdits.tex;
              if ("moisture" in subEdits) updatedSample["sampl/moisture"] = subEdits.moisture;
              if ("dep" in subEdits) updatedSample["sampl/dep"] = subEdits.dep;
              if ("samloc" in subEdits) updatedSample["sampl/samloc"] = subEdits.samloc;
              if ("poin" in subEdits) updatedSample["sampl/poin"] = subEdits.poin;
              return updatedSample;
            }
            return s;
          })
          .filter((s: any, idx: number) => {
            const flatId = `${pid}_${idx}`;
            return !mod.deletions.includes(flatId);
          });
      }
      return updated;
    });
    
    reconciled = reconciled.filter(r => !Array.isArray(r.sampl) || r.sampl.length > 0);
    
    json.records = reconciled;
    json.count = reconciled.length;
    await fs.writeFile(soilDataPath, JSON.stringify(json, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to sync soil-data.json:", err);
  }
}
