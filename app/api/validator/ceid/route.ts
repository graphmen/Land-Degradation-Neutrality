import { NextResponse } from "next/server";
import { lookupNationalUnit, type CeidJoinRule } from "@/lib/ceid-join";

export const dynamic = "force-dynamic";

const RULES = new Set<CeidJoinRule>([
  "second_segment",
  "suffix_after_first_underscore",
  "full_ceid",
]);

/**
 * Mobile / QA: resolve field CEID to national unit LD summary (Phase 3.3 prep).
 * GET /api/validator/ceid?ceid=11268_17236&rule=second_segment
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ceid = searchParams.get("ceid");
  if (!ceid?.trim()) {
    return NextResponse.json(
      { success: false, error: "ceid query parameter required" },
      { status: 400 }
    );
  }
  const ruleRaw = searchParams.get("rule") ?? "second_segment";
  const rule = RULES.has(ruleRaw as CeidJoinRule)
    ? (ruleRaw as CeidJoinRule)
    : "second_segment";

  const result = lookupNationalUnit(ceid.trim(), rule);
  return NextResponse.json({ success: true, ...result });
}