import { NextResponse } from "next/server";
import { appendLocalRecords } from "@/lib/local-data-modifications";
import { buildSoilRowsFromMobileDraft, type MobileSoilDraft } from "@/lib/mobile-submit-mappers";
import { supabaseInsertLdn } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const draft = (await req.json()) as MobileSoilDraft;
    if (!draft?.ceid || !draft?.cores?.length) {
      return NextResponse.json(
        { success: false, error: "Invalid soil draft: ceid and at least one core required" },
        { status: 400 }
      );
    }

    const { cacheRecords, supabaseRows } = buildSoilRowsFromMobileDraft(draft);
    const db = await supabaseInsertLdn("soil_samples", supabaseRows);
    await appendLocalRecords("soil", cacheRecords);

    const sampleGov = cacheRecords[0];
    return NextResponse.json({
      success: true,
      rows: cacheRecords.length,
      persisted_to: db.ok ? ["supabase", "local_cache"] : ["local_cache"],
      supabase: db.ok ? "ok" : { status: db.status, error: db.error },
      governance: sampleGov
        ? {
            verification_status: sampleGov.verification_status,
            data_tier: sampleGov.data_tier,
            reporting_period: sampleGov.reporting_period,
            code_list_version: sampleGov.code_list_version,
            baseline_period_id: sampleGov.baseline_period_id,
          }
        : null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}