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
    return -1;
  }
}

export async function GET(): Promise<NextResponse> {
  const publicDir = path.join(process.cwd(), "public");

  const [ldnCount, soilCount, drylandsCount] = await Promise.all([
    countRecords(path.join(publicDir, "ldn-data.json")),
    countRecords(path.join(publicDir, "soil-data.json")),
    countRecords(path.join(publicDir, "drylands-data.json")),
  ]);

  return NextResponse.json({
    environment: {
      isVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV,
      offlineMode: process.env.OFFLINE_MODE ?? "(not set)",
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
    checkedAt: new Date().toISOString(),
  });
}
