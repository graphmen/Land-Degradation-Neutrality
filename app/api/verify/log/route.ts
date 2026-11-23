import { NextResponse } from "next/server";
import { listVerificationLog } from "@/lib/verification-log";

export const dynamic = "force-dynamic";

/** Read local verification audit trail (JSON mirror; Supabase when 005 applied). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const record_type = searchParams.get("entity") ?? searchParams.get("record_type") ?? undefined;
  const record_id = searchParams.get("record_id") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Math.min(parseInt(limitRaw, 10) || 100, 500) : 100;

  const entries = await listVerificationLog({
    record_type,
    record_id,
    limit,
  });

  return NextResponse.json({
    count: entries.length,
    entries,
  });
}