import { NextResponse } from "next/server";
import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

async function readRecordCounts(rootDir: string) {
  const counts = { ldn: 0, soil: 0 };
  try {
    const ldnRaw = await fs.readFile(path.join(rootDir, "public", "ldn-data.json"), "utf-8");
    const ldnJson = JSON.parse(ldnRaw);
    counts.ldn = ldnJson.count ?? (ldnJson.records?.length ?? 0);
  } catch {}
  try {
    const soilRaw = await fs.readFile(path.join(rootDir, "public", "soil-data.json"), "utf-8");
    const soilJson = JSON.parse(soilRaw);
    counts.soil = soilJson.count ?? (soilJson.records?.length ?? 0);
  } catch {}
  return counts;
}

/** Try to resolve python executable — check common locations on Windows */
function getPythonCmd(): string {
  // On Windows, try common install locations via environment variable or default to "python"
  if (process.platform === "win32") {
    // Check if PYTHON_PATH env is set (can be set in .env.local)
    const envPython = process.env.PYTHON_PATH;
    if (envPython) return envPython;
    return "python";
  }
  return "python3";
}

/** Run the python download script. Returns { success, stdout, stderr, error? } */
function runDownloadScript(rootDir: string): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
  return new Promise((resolve) => {
    const pythonCmd = getPythonCmd();
    const scriptPath = path.join(rootDir, "download_ldn.py");

    console.log(`[Sync] Running: ${pythonCmd} "${scriptPath}" in ${rootDir}`);

    execFile(
      pythonCmd,
      [scriptPath],
      {
        cwd: rootDir,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120_000, // 2 minute timeout
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      },
      (err, stdout, stderr) => {
        if (stdout) console.log("[Sync stdout]", stdout.slice(0, 2000));
        if (stderr) console.warn("[Sync stderr]", stderr.slice(0, 2000));

        if (err) {
          console.error("[Sync] download_ldn.py failed:", err.message);
          resolve({ success: false, stdout, stderr, error: err.message });
        } else {
          resolve({ success: true, stdout, stderr });
        }
      }
    );
  });
}

/** Direct Kobo API fallback — fetches records and writes local JSON files */
async function directKoboFallback(rootDir: string): Promise<{ ldn: number; soil: number }> {
  const KOBO_URL = process.env.KOBO_API_URL || "https://kf.kobotoolbox.org/api/v2";
  const USERNAME = process.env.KOBO_USERNAME || "vegris2020";
  const PASSWORD = process.env.KOBO_PASSWORD || "musasa2020";
  const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
  const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" };

  const FORMS: Record<string, string | string[]> = {
    ldn: "apM5C5mTP34m2m3DSwdd4E",
    soil: ["am3UGrEY8tYcnrMp3Xddys", "ahkCvpctsofMKN4GzCH3BT"],
  };

  const counts = { ldn: 0, soil: 0 };
  const publicDir = path.join(rootDir, "public");

  await fs.mkdir(publicDir, { recursive: true });

  for (const [formName, assetIds] of Object.entries(FORMS)) {
    const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
    const allRecords: any[] = [];

    for (const assetId of ids) {
      let url: string | null = `${KOBO_URL}/assets/${assetId}/data/?format=json&limit=5000`;
      while (url) {
        try {
          const res = await fetch(url, { headers, cache: "no-store" });
          if (!res.ok) {
            console.warn(`[Sync Fallback] Kobo ${formName}/${assetId} returned ${res.status}`);
            break;
          }
          const json = await res.json();
          const batch = json.results || [];
          allRecords.push(...batch);
          url = json.next || null;
        } catch (e: any) {
          console.warn(`[Sync Fallback] Fetch error for ${formName}/${assetId}: ${e.message}`);
          break;
        }
      }
    }

    // Deduplicate by _id
    const seen = new Set<string>();
    const deduplicated = allRecords.filter((r) => {
      const id = String(r._id || r.id || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const outPath = path.join(publicDir, `${formName}-data.json`);
    await fs.writeFile(outPath, JSON.stringify({ count: deduplicated.length, records: deduplicated }, null, 2), "utf-8");
    counts[formName as "ldn" | "soil"] = deduplicated.length;
    console.log(`[Sync Fallback] Saved ${deduplicated.length} ${formName} records to ${outPath}`);
  }

  return counts;
}

export async function POST(): Promise<NextResponse> {
  // If running on Vercel, use direct Kobo API instead of Python script
  if (process.env.VERCEL) {
    try {
      const counts = await directKoboFallback(process.cwd());
      return NextResponse.json({
        success: true,
        message: `Synced ${counts.ldn} LDN and ${counts.soil} soil records directly from KoboToolbox.`,
        counts,
        method: "direct-kobo",
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: `Direct Kobo sync failed: ${e.message}` },
        { status: 500 }
      );
    }
  }

  const rootDir = process.cwd();

  console.log("[Sync] Sync trigger received. rootDir:", rootDir);

  // 1. Try the Python download script first
  const scriptResult = await runDownloadScript(rootDir);

  if (scriptResult.success) {
    const counts = await readRecordCounts(rootDir);
    console.log("[Sync] Python script completed successfully.", counts);
    return NextResponse.json({
      success: true,
      message: `Cached ${counts.ldn} LDN and ${counts.soil} soil records from Supabase Database.`,
      counts,
      method: "database-sync",
    });
  }

  // 2. Python script failed — attempt direct Kobo API fallback
  console.warn("[Sync] Python script failed. Attempting direct Kobo API fallback...");
  try {
    const counts = await directKoboFallback(rootDir);
    return NextResponse.json({
      success: true,
      message: `Synced ${counts.ldn} LDN and ${counts.soil} soil records directly from KoboToolbox (Python script unavailable).`,
      counts,
      method: "direct-kobo-fallback",
      warning: `Python script failed: ${scriptResult.error || scriptResult.stderr || "unknown error"}`,
    });
  } catch (e: any) {
    // Both methods failed
    return NextResponse.json(
      {
        error: `Sync failed via both Python script and direct Kobo API. Script error: ${scriptResult.error || scriptResult.stderr}. API error: ${e.message}`,
      },
      { status: 500 }
    );
  }
}
