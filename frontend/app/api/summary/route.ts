import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KOBO_URL = "https://kf.kobotoolbox.org/api/v2";
const ASSET_ID = "aKNhuHN8S3FUmXeGqi8C3H";
const AUTH = Buffer.from("oaubats:oaubats").toString("base64");
const OFFLINE_MODE = true; // Toggle for offline local data fallback

async function koboFetch(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000); // 30s timeout
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${AUTH}`, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`KoboToolbox returned ${res.status}: ${res.statusText}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

const HABITAT_KEYS = ["habitat_type","habitat","land_use","landuse","vegetation_type","environment"];
const COLONY_KEYS  = ["colony_size","bat_count","number_of_bats","estimated_bats","population_size","count"];
const DISTRICT_KEYS= ["lga","district","local_government","location_name","area","site_name","community"];
const DATE_KEYS    = ["today","start","date","_submission_time"];

function findField(record: any, keys: string[]) {
  return keys.find(k => record[k] !== undefined && record[k] !== null && record[k] !== "") ?? null;
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

function extractGeo(r: any): [number, number] | null {
  const g = r._geolocation;
  if (Array.isArray(g) && g.length >= 2 && g[0] != null) return [+g[0], +g[1]];
  for (const k of ["GPS","gps","location","geopoint"]) {
    const v = r[k];
    if (typeof v === "string") {
      const p = v.split(" ");
      if (p.length >= 2 && !isNaN(+p[0])) return [+p[0], +p[1]];
    }
  }
  return null;
}

let _cache: { data: any[]; ts: number } | null = null;

async function getAllRecords(): Promise<any[]> {
  const now = Date.now();
  if (_cache && now - _cache.ts < 300_000) return _cache.data;

  if (OFFLINE_MODE) {
    try {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", "kobo-data.json");
      const fileData = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(fileData);
      const records = (json.records || []).map(normalise);
      _cache = { data: records, ts: now };
      return records;
    } catch (fsErr: any) {
      console.error("Local summary read failed:", fsErr);
      return [];
    }
  }

  try {
    const records: any[] = [];
    let url: string | null = `${KOBO_URL}/assets/${ASSET_ID}/data/?format=json&limit=5000`;

    while (url) {
      const json = await koboFetch(url);
      records.push(...(json.results ?? []).map(normalise));
      url = json.next ?? null;
    }
    _cache = { data: records, ts: now };
    return records;
  } catch (e: any) {
    try {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", "kobo-data.json");
      const fileData = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(fileData);
      const records = (json.records || []).map(normalise);
      _cache = { data: records, ts: now };
      return records;
    } catch (fsErr: any) {
      console.error("Local summary fallback read failed:", fsErr);
      throw e;
    }
  }
}

export async function GET() {
  try {
    const records = await getAllRecords();

    let habitatF: string|null = null, colonyF: string|null = null,
        districtF: string|null = null;
    for (const r of records.slice(0, 20)) {
      habitatF  ??= findField(r, HABITAT_KEYS);
      colonyF   ??= findField(r, COLONY_KEYS);
      districtF ??= findField(r, DISTRICT_KEYS);
    }

    const habitatCnt: Record<string,number> = {};
    const districtCnt: Record<string,number> = {};
    const monthlyCnt: Record<string,number> = {};
    const colonyVals: number[] = [];

    for (const r of records) {
      if (habitatF && r[habitatF]) habitatCnt[r[habitatF]] = (habitatCnt[r[habitatF]]||0)+1;
      if (districtF && r[districtF]) districtCnt[r[districtF]] = (districtCnt[r[districtF]]||0)+1;
      if (colonyF && r[colonyF]) { const v = parseFloat(r[colonyF]); if (!isNaN(v) && v>0) colonyVals.push(v); }
      for (const dk of DATE_KEYS) {
        const v = r[dk];
        if (typeof v === "string" && v.length >= 7) { monthlyCnt[v.slice(0,7)] = (monthlyCnt[v.slice(0,7)]||0)+1; break; }
      }
    }

    const spatialCount = records.filter(r => extractGeo(r) !== null).length;
    const totalBats = colonyVals.reduce((a,b)=>a+b,0);
    const avgColony = colonyVals.length ? +(totalBats/colonyVals.length).toFixed(1) : 0;

    const top = <T extends Record<string,number>>(obj: T, n=10) =>
      Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([name,value])=>({name,value}));

    return NextResponse.json({
      total: records.length,
      spatial_count: spatialCount,
      kpis: {
        total_roosts: records.length,
        mapped_roosts: spatialCount,
        total_bats: Math.round(totalBats),
        avg_colony_size: avgColony,
        habitat_types: Object.keys(habitatCnt).length,
        districts: Object.keys(districtCnt).length,
      },
      detected_fields: { habitat: habitatF, colony: colonyF, district: districtF },
      charts: {
        by_habitat:  top(habitatCnt),
        by_district: top(districtCnt),
        by_month: Object.entries(monthlyCnt).sort().map(([month,count])=>({month,count})),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
