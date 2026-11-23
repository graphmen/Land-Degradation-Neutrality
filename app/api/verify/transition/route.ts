import { NextResponse } from "next/server";
import {
  enrichComplianceFields,
  type VerificationStatus,
} from "@/lib/compliance-metadata";
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

type Body = {
  entity: string;
  record_id: string;
  from_status: VerificationStatus;
  to_status: VerificationStatus;
  actor: string;
  actor_role?: string | null;
  comment?: string;
  reporting_period?: string | null;
};

/** Annex E §E.2 — local-cache verification transitions (no R1 UI yet). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.entity || !body?.record_id || !body?.actor) {
      return NextResponse.json(
        { success: false, error: "entity, record_id, and actor are required" },
        { status: 400 }
      );
    }
    if (!isEntityKind(body.entity)) {
      return NextResponse.json(
        { success: false, error: `entity must be one of: ${ENTITIES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!body.from_status || !body.to_status) {
      return NextResponse.json(
        { success: false, error: "from_status and to_status are required" },
        { status: 400 }
      );
    }

    const patch = buildTransitionPatch(body.from_status, body.to_status, {
      actor: body.actor,
      comment: body.comment,
      reporting_period: body.reporting_period,
    });

    await patchLocalRecord(body.entity, String(body.record_id), patch);

    const logEntry = await appendVerificationLog({
      record_type: body.entity,
      record_id: String(body.record_id),
      from_status: body.from_status,
      to_status: body.to_status,
      actor_id: body.actor,
      actor_role: body.actor_role ?? null,
      reporting_period: patch.reporting_period ?? null,
      note: body.comment ?? null,
      metadata: {
        district_note: patch.district_note,
        national_note: patch.national_note,
        rejection_reason: patch.rejection_reason,
        verification_comment: patch.verification_comment,
      },
    });

    const governance = enrichComplianceFields({
      _id: body.record_id,
      ...patch,
    });

    return NextResponse.json({
      success: true,
      record_id: body.record_id,
      entity: body.entity,
      governance,
      audit: { id: logEntry.id, created_at: logEntry.created_at },
    });
  } catch (e: unknown) {
    if (e instanceof VerificationTransitionError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}