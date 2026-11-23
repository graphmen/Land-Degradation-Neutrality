import { NextResponse } from "next/server";
import type { VerificationStatus } from "@/lib/compliance-metadata";
import { patchLocalRecord } from "@/lib/local-data-modifications";
import {
  buildTransitionPatch,
  VerificationTransitionError,
} from "@/lib/verification-transitions";
import { appendVerificationLog } from "@/lib/verification-log";

export const dynamic = "force-dynamic";

const ENTITIES = ["ldn", "soil", "drylands"] as const;
type EntityKind = (typeof ENTITIES)[number];

function isEntityKind(v: string): v is EntityKind {
  return (ENTITIES as readonly string[]).includes(v);
}

type BulkItem = {
  entity: string;
  record_id: string;
  from_status: VerificationStatus;
};

type BulkBody = {
  records: BulkItem[];
  to_status: VerificationStatus;
  actor: string;
  actor_role?: string | null;
  comment?: string;
  reporting_period?: string | null;
};

/**
 * Annex E §E.2 — Batch verification transition endpoint for district & national officers.
 * Writes an individual audit trail entry in verification_log for every transitioned record.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BulkBody;
    if (!Array.isArray(body?.records) || body.records.length === 0) {
      return NextResponse.json(
        { success: false, error: "records array is required and must not be empty" },
        { status: 400 }
      );
    }
    if (!body.to_status || !body.actor?.trim()) {
      return NextResponse.json(
        { success: false, error: "to_status and actor are required" },
        { status: 400 }
      );
    }

    const batch = body.records.slice(0, 200);
    let processed = 0;
    let failed = 0;
    const errors: Array<{ record_id: string; error: string }> = [];

    for (const item of batch) {
      try {
        if (!isEntityKind(item.entity)) {
          throw new Error(`Invalid entity: ${item.entity}`);
        }
        const patch = buildTransitionPatch(item.from_status, body.to_status, {
          actor: body.actor.trim(),
          comment: body.comment,
          reporting_period: body.reporting_period,
        });

        await patchLocalRecord(item.entity, String(item.record_id), patch);

        await appendVerificationLog({
          record_type: item.entity,
          record_id: String(item.record_id),
          from_status: item.from_status,
          to_status: body.to_status,
          actor_id: body.actor.trim(),
          actor_role: body.actor_role ?? null,
          reporting_period: patch.reporting_period ?? null,
          note: body.comment ? `[Batch] ${body.comment}` : "[Batch verification]",
          metadata: {
            batch_size: batch.length,
            district_note: patch.district_note,
            national_note: patch.national_note,
            rejection_reason: patch.rejection_reason,
            verification_comment: patch.verification_comment,
          },
        });
        processed++;
      } catch (e: unknown) {
        failed++;
        const msg =
          e instanceof VerificationTransitionError || e instanceof Error
            ? e.message
            : String(e);
        errors.push({ record_id: String(item.record_id), error: msg });
      }
    }

    return NextResponse.json({
      success: processed > 0,
      processed,
      failed,
      errors: errors.slice(0, 20),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
