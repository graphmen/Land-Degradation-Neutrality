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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "300");

  if (OFFLINE_MODE) {
    try {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", "kobo-data.json");
      const fileData = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(fileData);
      const rawRecords = json.records || [];
      const records = rawRecords.map(normalise);
      const fields = records.length
        ? Object.keys(records[0]).filter(k => !k.startsWith("_") && !k.includes("/"))
        : [];
      return NextResponse.json({
        count: records.length,
        records: records.slice(0, limit),
        fields,
        fallback: true
      });
    } catch (fsErr: any) {
      return NextResponse.json({ count: 0, records: [], error: `Fallback failed: ${fsErr.message}` }, { status: 500 });
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

    const fields = records.length
      ? Object.keys(records[0]).filter(k => !k.startsWith("_") && !k.includes("/"))
      : [];

    return NextResponse.json({
      count: records.length,
      records: records.slice(0, limit),
      fields,
    });
  } catch (e: any) {
    try {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", "kobo-data.json");
      const fileData = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(fileData);
      const rawRecords = json.records || [];
      const records = rawRecords.map(normalise);
      const fields = records.length
        ? Object.keys(records[0]).filter(k => !k.startsWith("_") && !k.includes("/"))
        : [];
      return NextResponse.json({
        count: records.length,
        records: records.slice(0, limit),
        fields,
        fallback: true,
        error: e.message
      });
    } catch (fsErr: any) {
      return NextResponse.json({ error: `${e.message} (Fallback failed: ${fsErr.message})` }, { status: 500 });
    }
  }
}
