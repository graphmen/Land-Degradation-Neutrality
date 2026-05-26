import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KOBO_URL = "https://kc.kobotoolbox.org/api/v1/data";
const KOBO_USER = process.env.KOBO_USERNAME || "vegris2020";
const KOBO_PASS = process.env.KOBO_PASSWORD || "musasa2020";
const AUTH = Buffer.from(`${KOBO_USER}:${KOBO_PASS}`).toString("base64");
const OFFLINE_MODE = process.env.OFFLINE_MODE !== "false"; // Defaults to true (offline), set to 'false' in production env vars for live sync


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
  if (OFFLINE_MODE) {
    try {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", "ldn-data.json");
      const fileData = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(fileData);
      const records = (json.records || []).map(normalise);
      return NextResponse.json({
        count: records.length,
        records: records,
        fallback: true
      });
    } catch (fsErr: any) {
      return NextResponse.json({ count: 0, records: [], error: `Fallback failed: ${fsErr.message}` }, { status: 500 });
    }
  }

  try {
    // 1. Fetch all forms to find the numeric ID for the LDN form
    const formsRes = await fetch(KOBO_URL, {
      headers: { Authorization: `Basic ${AUTH}` },
      cache: "no-store",
    });
    
    if (!formsRes.ok) {
        throw new Error(`KoboToolbox Error fetching forms: ${formsRes.status}`);
    }
    
    const forms = await formsRes.json();
    
    // Find the LDN form by title or ID string
    const targetForm = forms.find((f: any) => 
        (f.title && f.title.toLowerCase().includes("ldn validation form")) ||
        (f.id_string && f.id_string.toLowerCase().includes("ldn"))
    );

    if (!targetForm) {
        return NextResponse.json({ 
            count: 0,
            records: [],
            error: "Could not find 'LDN validation form'. Available forms: " + forms.map((f:any) => f.title).join(", ") 
        }, { status: 404 });
    }

    // 2. Fetch the data for that specific form
    const dataUrl = targetForm.url; // e.g. https://kc.kobotoolbox.org/api/v1/data/12345
    const dataRes = await fetch(dataUrl, {
      headers: { Authorization: `Basic ${AUTH}` },
      cache: "no-store",
    });

    if (!dataRes.ok) {
        throw new Error(`KoboToolbox Error fetching data: ${dataRes.status}`);
    }

    const json = await dataRes.json();
    // Kobo v1 API returns the array directly
    const rawRecords = Array.isArray(json) ? json : (json.results || []);
    const records = rawRecords.map(normalise);

    return NextResponse.json({
      count: records.length,
      records: records,
    });
  } catch (e: any) {
    try {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", "ldn-data.json");
      const fileData = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(fileData);
      const records = (json.records || []).map(normalise);
      return NextResponse.json({
        count: records.length,
        records: records,
        fallback: true
      });
    } catch (fsErr: any) {
      return NextResponse.json({ count: 0, records: [], error: `${e.message} (Fallback failed: ${fsErr.message})` }, { status: 500 });
    }
  }
}

