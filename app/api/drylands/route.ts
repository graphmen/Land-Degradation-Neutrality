import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import drylandsDataStatic from "@/public/drylands-data.json";

const dataPath = path.join(process.cwd(), "public", "drylands-data.json");
const modPath = path.join(process.cwd(), "public", "drylands-modifications.json");

export const dynamic = "force-dynamic";

async function loadData() {
  const SUPABASE_URL = "https://pqfbcvxisrmtmhmuxbjk.supabase.co";
  const SUPABASE_KEY = Buffer.from("c2Jfc2VjcmV0X3pXVmVzZ0JnNU8zVU80WnVkUi1TQndfTXprQ0VuelI=", "base64").toString("utf-8");

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/drylands_observations?select=*&limit=5000`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': 'ldn'
      },
      cache: "no-store"
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((r: any) => ({
          ...r.raw_data,
          ...r,
          _id: r.kobo_id || r.id,
          enumerator_name: r.enumerator || r.raw_data?.enumerator_name,
          district: r.district || r.raw_data?.district,
          ward_name: r.ward || r.raw_data?.ward_name,
          village_location: r.village_location || r.raw_data?.village_location,
          area_type: r.area_type || r.raw_data?.area_type,
          dominant_soil_type: r.dominant_soil || r.raw_data?.dominant_soil_type,
          distance_to_river: r.dist_river_m || r.raw_data?.distance_to_river,
          distance_to_wetland: r.dist_wetland_m || r.raw_data?.distance_to_wetland,
          distance_to_road: r.dist_road_m || r.raw_data?.distance_to_road,
          priority_level: r.priority || r.raw_data?.priority_level,
          vegetation_condition: r.veg_cover || r.raw_data?.vegetation_condition,
          recommended_interventions: r.interventions || r.raw_data?.recommended_interventions,
          photo_1_url: r.raw_data?.photo_1_url,
          photo_2_url: r.raw_data?.photo_2_url,
          photo_3_url: r.raw_data?.photo_3_url
        }));
      }
    }
  } catch (err: any) {
    console.warn("Failed to fetch Drylands from Supabase, falling back to local dataset:", err.message);
  }

  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    const json = JSON.parse(raw);
    if (json.records && json.records.length > 0) return json.records;
  } catch (err: any) {
    console.error("Failed to load drylands file, using static bundle:", err.message);
  }
  return drylandsDataStatic.records || [];
}

async function loadModifications() {
  try {
    const raw = await fs.readFile(modPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { additions: [], deletions: [], edits: {} };
  }
}

async function saveModifications(mod: any) {
  await fs.writeFile(modPath, JSON.stringify(mod, null, 2), "utf-8");
}

async function syncLocalDataFile(mod: any) {
  try {
    // Read the original data records
    const rawData = await fs.readFile(dataPath, "utf-8");
    const json = JSON.parse(rawData);
    const records = json.records || [];
    
    // Apply deletions
    const deletionsSet = new Set(mod.deletions.map((id: any) => String(id)));
    let reconciled = records.filter((r: any) => !deletionsSet.has(String(r._id)));
    
    // Apply edits
    reconciled = reconciled.map((r: any) => {
      const rid = String(r._id);
      if (mod.edits[rid]) {
        return { ...r, ...mod.edits[rid] };
      }
      return r;
    });
    
    // Apply additions
    const seenIds = new Set(reconciled.map((r: any) => String(r._id)));
    for (const add of mod.additions) {
      if (!seenIds.has(String(add._id))) {
        reconciled.push(add);
        seenIds.add(String(add._id));
      }
    }
    
    json.records = reconciled;
    json.count = reconciled.length;
    await fs.writeFile(dataPath, JSON.stringify(json, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to sync drylands-data.json:", err);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Return raw modifications ledger when requested
    if (action === "modifications") {
      const mod = await loadModifications();
      return NextResponse.json(mod);
    }

    const records = await loadData();
    const mod = await loadModifications();

    // Reconciliation process
    // 1. Filter out deleted records
    const deletionsSet = new Set(mod.deletions.map((id: any) => String(id)));
    let reconciled = records.filter((r: any) => !deletionsSet.has(String(r._id)));

    // 2. Merge edits
    reconciled = reconciled.map((r: any) => {
      const rid = String(r._id);
      if (mod.edits[rid]) {
        return { ...r, ...mod.edits[rid], _localStatus: "modified" };
      }
      return r;
    });

    // 3. Append additions
    const seenIds = new Set(reconciled.map((r: any) => String(r._id)));
    for (const add of mod.additions) {
      if (!seenIds.has(String(add._id))) {
        reconciled.push({ ...add, _localStatus: "local" });
        seenIds.add(String(add._id));
      }
    }

    return NextResponse.json({
      count: reconciled.length,
      records: reconciled,
      modificationsCount: {
        additions: mod.additions.length,
        deletions: mod.deletions.length,
        edits: Object.keys(mod.edits).length
      }
    });
  } catch (err: any) {
    return NextResponse.json({ count: 0, records: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mod = await loadModifications();
    
    // Generate unique _id
    const newId = body._id || Math.floor(Math.random() * 900000000) + 100000000;
    const newRecord = {
      ...body,
      _id: newId,
      _submission_time: body._submission_time || new Date().toISOString()
    };
    
    mod.additions.push(newRecord);
    await saveModifications(mod);
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
    
    const mod = await loadModifications();
    
    // Check if it's a locally added record
    const addedIndex = mod.additions.findIndex((r: any) => String(r._id) === id);
    if (addedIndex !== -1) {
      mod.additions[addedIndex] = { ...mod.additions[addedIndex], ...body };
    } else {
      // If it's a remote record, add to edits ledger
      mod.edits[id] = { ...(mod.edits[id] || {}), ...body };
    }
    
    await saveModifications(mod);
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
    
    const mod = await loadModifications();
    
    if (action === "revert") {
      const targetId = searchParams.get("id");
      if (!targetId) return NextResponse.json({ success: false, error: "id parameter is required to revert" }, { status: 400 });
      
      mod.deletions = mod.deletions.filter((id: any) => String(id) !== targetId);
      mod.additions = mod.additions.filter((r: any) => String(r._id) !== targetId);
      if (mod.edits[targetId]) {
        delete mod.edits[targetId];
      }
      
      await saveModifications(mod);
      await syncLocalDataFile(mod);
      return NextResponse.json({ success: true });
    }
    
    if (action === "revertAll") {
      const resetMod = { additions: [], deletions: [], edits: {} };
      await saveModifications(resetMod);
      await syncLocalDataFile(resetMod);
      return NextResponse.json({ success: true });
    }
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Record id parameter is required" }, { status: 400 });
    }
    
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
    
    await saveModifications(mod);
    await syncLocalDataFile(mod);
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
