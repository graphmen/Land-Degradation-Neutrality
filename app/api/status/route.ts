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

  const reportingPeriod =
    (await import("@/public/reporting-period-config.json")).default?.periods?.find(
      (p: { is_active?: boolean }) => p.is_active
    )?.reporting_period ?? null;

  let lockedLdn = 0;
  try {
    const { buildExpSo1FieldPackage } = await import("@/lib/exp-so1-field-export");
    const pkg = await buildExpSo1FieldPackage({ eligibility: "locked" });
    lockedLdn = pkg.stats.ldn_exported;
  } catch {
    lockedLdn = -1;
  }

  return NextResponse.json({
    programme: {
      reporting_period: reportingPeriod,
      locked_ldn_exports: lockedLdn,
      export_routes: [
        "/api/export/meta",
        "/api/export/so1-field",
        "/api/export/so1-status",
        "/api/export/photos",
        "/api/export/bundle",
        "/api/validator/ceid",
        "/api/pressure-layers",
        "/api/corpus-layers",
        "/api/qc/summary",
        "/api/national-overview",
        "/api/evidence/registry",
        "/api/interventions",
        "/api/verify/transition",
        "/api/verify/queues",
        "/api/config/s2-preflight",
      ],
    },
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
