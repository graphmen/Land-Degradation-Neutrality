import { NextResponse } from "next/server";
import { appendLocalRecords } from "@/lib/local-data-modifications";
import { buildLdnFromMobileDraft, type MobileLdnDraft } from "@/lib/mobile-submit-mappers";
import { supabaseInsertLdn } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

/** Mobile queue upload: Supabase first, JSON cache second (Step 2.3). */
export async function POST(req: Request) {
  try {
    const draft = (await req.json()) as MobileLdnDraft;
    if (!draft?.ceid || !draft?.dist) {
      return NextResponse.json(
        { success: false, error: "Invalid LDN draft: ceid and dist required" },
        { status: 400 }
      );
    }

    const { cacheRecord, supabaseRow, koboId } = buildLdnFromMobileDraft(draft);
    const db = await supabaseInsertLdn("ldn_validations", supabaseRow);
    await appendLocalRecords("ldn", cacheRecord);

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