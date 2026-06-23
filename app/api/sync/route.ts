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

export async function POST(): Promise<NextResponse> {
  // If running on Vercel, return a warning instead of attempting to run python scripts
  if (process.env.VERCEL) {
    return NextResponse.json({
      error: "On-demand data sync via Python script is not supported in the serverless environment. The application will serve cached telemetry or direct KoboToolbox API requests."
    }, { status: 400 });
  }

  const rootDir = process.cwd();
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  return new Promise<NextResponse>((resolve) => {
    console.log("Sync trigger received. Running download script in:", rootDir);

    execFile(
      pythonCmd,
      ["download_ldn.py"],
      { cwd: rootDir, maxBuffer: 10 * 1024 * 1024 },
      async (err, stdout, stderr) => {
        if (stdout) console.log(stdout);
        if (stderr) console.warn(stderr);

        if (err) {
          console.error("download_ldn.py failed:", err, stderr);
          resolve(NextResponse.json({
            error: `Failed to download LDN/soil data from Kobo Collect: ${stderr || err.message}`,
          }, { status: 500 }));
          return;
        }

        const counts = await readRecordCounts(rootDir);
        console.log("LDN & Soil telemetry sync completed successfully.", counts);
        resolve(NextResponse.json({
          success: true,
          message: `Cached ${counts.ldn} LDN and ${counts.soil} soil records from Kobo Collect.`,
          counts,
        }));
      }
    );
  });
}
