import { NextResponse } from "next/server";
import { buildAndWriteReportingBundle } from "@/lib/exp-reporting-bundle";
import type { EligibilityMode } from "@/lib/exp-so1-field-export";

export const dynamic = "force-dynamic";

/** Write full reporting desk package tree (§F rehearsal by default). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rehearsal = searchParams.get("official") !== "1";
    const eligibility = searchParams.get("eligibility") as EligibilityMode | null;
    const bundle = await buildAndWriteReportingBundle({
      reporting_period: searchParams.get("reporting_period"),
      eligibility: eligibility ?? undefined,
      rehearsal,
    });
    return NextResponse.json(bundle);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}