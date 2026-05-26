import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KOBO_URL = "https://kf.kobotoolbox.org/api/v2";
const ASSET_ID = "aKNhuHN8S3FUmXeGqi8C3H";
const AUTH = Buffer.from("oaubats:oaubats").toString("base64");
const OFFLINE_MODE = true; // Toggle for offline local data fallback

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

export async function GET() {
  if (OFFLINE_MODE) {
    try {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", "kobo-data.json");
      const fileData = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(fileData);
      const rawRecords = json.records || [];
      const records = rawRecords.map(normalise);
      const features = records
        .map(r => {
          const geo = extractGeo(r);
          if (!geo) return null;
          const [lat, lng] = geo;
          const props: any = { _id: r._id, _submission_time: r._submission_time };
          for (const [k, v] of Object.entries(r)) {
            if (!k.startsWith("_") && !k.includes("/")) props[k] = v;
          }
          return {
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: props,
          };
        })
        .filter(Boolean);

      return NextResponse.json({ type: "FeatureCollection", features, total: features.length, fallback: true });
    } catch (fsErr: any) {
      return NextResponse.json({ error: `Fallback failed: ${fsErr.message}` }, { status: 500 });
    }
  }

  try {
    const records: any[] = [];
    let url: string | null = `${KOBO_URL}/assets/${ASSET_ID}/data/?format=json&limit=5000`;
    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${AUTH}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`KoboToolbox: ${res.status}`);
      const json = await res.json();
      records.push(...(json.results ?? []).map(normalise));
      url = json.next ?? null;
    }

    const features = records
      .map(r => {
        const geo = extractGeo(r);
        if (!geo) return null;
        const [lat, lng] = geo;
        const props: any = { _id: r._id, _submission_time: r._submission_time };
        for (const [k, v] of Object.entries(r)) {
          if (!k.startsWith("_") && !k.includes("/")) props[k] = v;
        }
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: props,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ type: "FeatureCollection", features, total: features.length });
  } catch (e: any) {
    try {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", "kobo-data.json");
      const fileData = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(fileData);
      const rawRecords = json.records || [];
      const records = rawRecords.map(normalise);
      const features = records
        .map(r => {
          const geo = extractGeo(r);
          if (!geo) return null;
          const [lat, lng] = geo;
          const props: any = { _id: r._id, _submission_time: r._submission_time };
          for (const [k, v] of Object.entries(r)) {
            if (!k.startsWith("_") && !k.includes("/")) props[k] = v;
          }
          return {
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: props,
          };
        })
        .filter(Boolean);

      return NextResponse.json({ type: "FeatureCollection", features, total: features.length, fallback: true, error: e.message });
    } catch (fsErr: any) {
      return NextResponse.json({ error: `${e.message} (Fallback failed: ${fsErr.message})` }, { status: 500 });
    }
  }
}
