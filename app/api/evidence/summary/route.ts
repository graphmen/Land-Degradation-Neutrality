import { NextResponse } from "next/server";
import { buildEvidenceSummary } from "@/lib/evidence-summary";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (process.env.ENABLE_EVIDENCE_REGISTRY_API === "false") {
    return NextResponse.json(
      {
        error: "Evidence API disabled",
        doc: "LDN Database Princeples/design/R1_EVIDENCE_REGISTRY_API.md",
      },
      { status: 404 }
    );
  }

  try {
    const pkg = await buildEvidenceSummary();
    return NextResponse.json(pkg);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}