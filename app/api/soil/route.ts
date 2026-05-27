import { NextResponse } from "next/server";
import soilData from "@/public/soil-data.json";

export const dynamic = "force-dynamic";

const KOBO_URL = "https://kc.kobotoolbox.org/api/v1/data";
const KOBO_USER = process.env.KOBO_USERNAME || "vegris2020";
const KOBO_PASS = process.env.KOBO_PASSWORD || "musasa2020";
const AUTH = Buffer.from(`${KOBO_USER}:${KOBO_PASS}`).toString("base64");
const OFFLINE_MODE = process.env.OFFLINE_MODE !== "false"; // Defaults to true (offline), set to 'false' in production env vars for live sync
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

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

function loadLocalFallback() {
  const json = soilData as any;
  const records = (json.records || []).map(normalise);
  return {
    count: records.length,
    records: records,
    fallback: true
  };
}

export async function GET(req: Request) {
  if (OFFLINE_MODE) {
    try {
      return NextResponse.json(loadLocalFallback());
    } catch (fsErr: any) {
      return NextResponse.json({ count: 0, records: [], error: `Local fallback failed: ${fsErr.message}` }, { status: 500 });
    }
  }

  // ONLINE MODE: Attempt to fetch from FastAPI backend first
  try {
    console.log(`Connecting to backend at: ${BACKEND_URL}/api/soil`);
    const backendRes = await fetch(`${BACKEND_URL}/api/soil`, { cache: "no-store" });
    if (backendRes.ok) {
      const json = await backendRes.json();
      return NextResponse.json({
        count: json.count,
        records: (json.records || []).map(normalise),
        source: "backend"
      });
    }
    console.warn(`Backend returned status ${backendRes.status}. Falling back to direct Kobo API fetch...`);
  } catch (backendErr: any) {
    console.warn(`Could not connect to backend: ${backendErr.message}. Falling back to direct Kobo API fetch...`);
  }

  // Direct Kobo API Fetch Fallback (standalone Vercel support)
  try {
    const formsRes = await fetch(KOBO_URL, {
      headers: { Authorization: `Basic ${AUTH}` },
      cache: "no-store",
    });
    
    if (!formsRes.ok) {
      throw new Error(`KoboToolbox Error fetching forms: ${formsRes.status}`);
    }
    
    const forms = await formsRes.json();
    
    // Find ALL forms with "soil"
    const matchingForms = forms.filter((f: any) => 
      (f.title && f.title.toLowerCase().includes("soil")) ||
      (f.id_string && f.id_string.toLowerCase().includes("soil"))
    );

    if (matchingForms.length === 0) {
      throw new Error("Could not find any form with 'soil'.");
    }

    // Sort by whichever one has "soil samples form" exact match first
    matchingForms.sort((a: any, b: any) => {
      const aExact = a.title.toLowerCase() === "soil samples form" ? 1 : 0;
      const bExact = b.title.toLowerCase() === "soil samples form" ? 1 : 0;
      return bExact - aExact;
    });

    const targetForm = matchingForms[0];
    const dataRes = await fetch(targetForm.url, {
      headers: { Authorization: `Basic ${AUTH}` },
      cache: "no-store",
    });

    if (!dataRes.ok) {
      throw new Error(`KoboToolbox Error fetching data: ${dataRes.status}`);
    }

    const json = await dataRes.json();
    const rawRecords = Array.isArray(json) ? json : (json.results || []);
    const records = rawRecords.map(normalise);

    // Fetch and merge Google Sheets data
    const gsUrl = process.env.GOOGLE_SHEET_SCRIPT_URL;
    if (gsUrl) {
      try {
        console.log(`Connecting to Google Sheets script at: ${gsUrl}`);
        const gsRes = await fetch(gsUrl, { cache: "no-store" });
        if (gsRes.ok) {
          const gsJson = await gsRes.json();
          const sheetRecords = (gsJson.soil || []).map(normalise);
          
          const seenIds = new Set(records.map((r: any) => String(r._id || r.id)));
          for (const sr of sheetRecords) {
            const srid = String(sr.id || sr._id || `sheet_soil_${Date.now()}_${Math.random()}`);
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

    return NextResponse.json({
      count: records.length,
      records: records,
      source: "kobotoolbox"
    });
  } catch (e: any) {
    // If everything else fails, fall back to local cache
    try {
      return NextResponse.json(loadLocalFallback());
    } catch (fsErr: any) {
      return NextResponse.json({ count: 0, records: [], error: `${e.message} (Fallback failed: ${fsErr.message})` }, { status: 500 });
    }
  }
}
