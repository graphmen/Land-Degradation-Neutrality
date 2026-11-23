import { NextResponse } from "next/server";
import { buildVerificationQueues } from "@/lib/verification-queues";

export const dynamic = "force-dynamic";

const VALID_QUEUES = new Set([
  "submitted",
  "district",
  "national",
  "approved",
  "locked",
  "rejected",
]);

export async function GET(req: Request): Promise<NextResponse> {
  if (process.env.ENABLE_VERIFICATION_QUEUES_API === "false") {
    return NextResponse.json(
      {
        error: "Verification queues API disabled",
        doc: "LDN Database Princeples/design/R1_VERIFICATION_QUEUES_API.md",
      },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const queue = searchParams.get("queue") ?? undefined;
  if (queue && !VALID_QUEUES.has(queue)) {
    return NextResponse.json(
      { error: "Invalid queue", valid: Array.from(VALID_QUEUES) },
      { status: 400 }
    );
  }

  try {
    const limit = searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : undefined;
    const pkg = await buildVerificationQueues({ queue, limit });
    return NextResponse.json(pkg);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}