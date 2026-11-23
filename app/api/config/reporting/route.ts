import { NextResponse } from "next/server";
import reportingConfig from "@/public/reporting-period-config.json";
import { DEFAULT_BASELINE_PERIOD_ID } from "@/lib/compliance-metadata";

export const dynamic = "force-dynamic";

/** National reporting period config (Annex E §E.4) — JSON until migration 004 is applied. */
export async function GET() {
  const active = reportingConfig.periods?.find((p) => p.is_active) ?? null;
  return NextResponse.json({
    ...reportingConfig,
    active_reporting_period: active?.reporting_period ?? null,
    default_baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
  });
}