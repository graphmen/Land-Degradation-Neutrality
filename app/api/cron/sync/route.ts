import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5 minutes for Kobo fetches

const KOBO_V2_URL = process.env.KOBO_API_URL || "https://kf.kobotoolbox.org/api/v2";
const KOBO_USER = process.env.KOBO_USERNAME || "vegris2020";
const KOBO_PASS = process.env.KOBO_PASSWORD || "musasa2020";
const AUTH = Buffer.from(`${KOBO_USER}:${KOBO_PASS}`).toString("base64");
const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_SCRIPT_URL;

// Shared in-memory cache — module-level so it persists across warm serverless invocations
// Exported so /api/ldn and /api/soil routes can read from it
export const cronCache: {
  ldn: { records: any[]; updatedAt: number } | null;
  soil: { records: any[]; updatedAt: number } | null;
} = {
  ldn: null,
  soil: null,
};

const LDN_FORMS = ["apM5C5mTP34m2m3DSwdd4E"];
const SOIL_FORMS = ["am3UGrEY8tYcnrMp3Xddys", "ahkCvpctsofMKN4GzCH3BT"];

async function fetchKoboForm(assetId: string): Promise<any[]> {
  const records: any[] = [];
  let url: string | null = `${KOBO_V2_URL}/assets/${assetId}/data/?format=json&limit=5000`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${AUTH}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Kobo ${assetId} returned ${res.status}`);
    const json = await res.json();
    records.push(...(json.results || []));
    url = json.next || null;
  }
  return records;
}

async function fetchGoogleSheets(): Promise<{ ldn: any[]; soil: any[] }> {
  if (!GOOGLE_SHEET_URL) return { ldn: [], soil: [] };
  try {
    const res = await fetch(GOOGLE_SHEET_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch (e: any) {
    console.warn("[Cron] Google Sheets fetch failed:", e.message);
  }
  return { ldn: [], soil: [] };
}

function dedup(records: any[]): any[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    const id = String(r._id || r.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function runFullSync(): Promise<{ ldn: number; soil: number }> {
  console.log("[Cron] Starting full KoboToolbox sync...");

  // Fetch all sources in parallel
  const [ldnKobo, soilKoboA, soilKoboB, sheets] = await Promise.allSettled([
    fetchKoboForm(LDN_FORMS[0]),
    fetchKoboForm(SOIL_FORMS[0]),
    fetchKoboForm(SOIL_FORMS[1]),
    fetchGoogleSheets(),
  ]);

  const now = Date.now();

  // --- LDN ---
  let ldnRecords: any[] = [];
  if (ldnKobo.status === "fulfilled") ldnRecords.push(...ldnKobo.value);
  if (sheets.status === "fulfilled") ldnRecords.push(...(sheets.value.ldn || []));
  ldnRecords = dedup(ldnRecords);
  cronCache.ldn = { records: ldnRecords, updatedAt: now };
  console.log(`[Cron] LDN: ${ldnRecords.length} records cached.`);

  // --- Soil ---
  let soilRecords: any[] = [];
  if (soilKoboA.status === "fulfilled") soilRecords.push(...soilKoboA.value);
  if (soilKoboB.status === "fulfilled") soilRecords.push(...soilKoboB.value);
  if (sheets.status === "fulfilled") soilRecords.push(...(sheets.value.soil || []));
  soilRecords = dedup(soilRecords);
  cronCache.soil = { records: soilRecords, updatedAt: now };
  console.log(`[Cron] Soil: ${soilRecords.length} records cached.`);

  return { ldn: ldnRecords.length, soil: soilRecords.length };
}

export async function GET(req: Request): Promise<NextResponse> {
  // Validate cron secret — Vercel sends this header automatically when invoking crons.
  // Also accept direct requests with the correct Bearer token.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const hasValidToken =
    cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await runFullSync();
    return NextResponse.json({
      success: true,
      message: `Auto-sync complete: ${counts.ldn} LDN, ${counts.soil} soil records cached.`,
      counts,
      cachedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[Cron] Sync failed:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
