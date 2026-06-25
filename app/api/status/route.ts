import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

async function countRecords(filePath: string): Promise<number> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(raw);
    return json.count ?? (json.records?.length ?? 0);
  } catch {
    return -1; // -1 means file not found or unreadable
  }
}

export async function GET(): Promise<NextResponse> {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, "public");

  const [ldnCount, soilCount, drylandsCount] = await Promise.all([
    countRecords(path.join(publicDir, "ldn-data.json")),
    countRecords(path.join(publicDir, "soil-data.json")),
    countRecords(path.join(publicDir, "drylands-data.json")),
  ]);

  // Check for cron cache
  let cronCacheStatus: any = { ldn: null, soil: null };
  try {
    const cronMod = await import("@/app/api/cron/sync/route").catch(() => null);
    if (cronMod?.cronCache) {
      const { ldn, soil } = cronMod.cronCache;
      cronCacheStatus = {
        ldn: ldn ? { count: ldn.records.length, ageSeconds: Math.round((Date.now() - ldn.updatedAt) / 1000) } : null,
        soil: soil ? { count: soil.records.length, ageSeconds: Math.round((Date.now() - soil.updatedAt) / 1000) } : null,
      };
    }
  } catch {}

  return NextResponse.json({
    environment: {
      isVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV,
      offlineMode: process.env.OFFLINE_MODE ?? "(not set — defaults to true locally, false on Vercel)",
      hasKoboUsername: !!process.env.KOBO_USERNAME,
      hasKoboPassword: !!process.env.KOBO_PASSWORD,
      hasGoogleSheetUrl: !!process.env.GOOGLE_SHEET_SCRIPT_URL,
      hasCronSecret: !!process.env.CRON_SECRET,
    },
    staticFileRecords: {
      ldnDataJson: ldnCount,
      soilDataJson: soilCount,
      drylandsDataJson: drylandsCount,
    },
    cronCache: cronCacheStatus,
    checkedAt: new Date().toISOString(),
  });
}
