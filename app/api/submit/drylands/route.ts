import { NextResponse } from "next/server";
import { appendLocalRecords } from "@/lib/local-data-modifications";
import { buildDrylandsFromMobileDraft, type MobileDrylandsDraft } from "@/lib/mobile-submit-mappers";
import { supabaseInsertLdn } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const draft = (await req.json()) as MobileDrylandsDraft;
    if (!draft?.id) {
      return NextResponse.json({ success: false, error: "Invalid drylands draft" }, { status: 400 });
    }

    const { cacheRecord, supabaseRow, koboId } = buildDrylandsFromMobileDraft(draft);
    const db = await supabaseInsertLdn("drylands_observations", supabaseRow);
    await appendLocalRecords("drylands", cacheRecord);

    return NextResponse.json({
      success: true,
      kobo_id: koboId,
      persisted_to: db.ok ? ["supabase", "local_cache"] : ["local_cache"],
      supabase: db.ok ? "ok" : { status: db.status, error: db.error },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}