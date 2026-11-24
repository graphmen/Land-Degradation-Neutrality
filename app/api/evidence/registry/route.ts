import { NextResponse } from "next/server";
import {
  buildEvidenceRegistry,
  type EvidenceType,
} from "@/lib/evidence-registry";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  if (process.env.ENABLE_EVIDENCE_REGISTRY_API === "false") {
    return NextResponse.json(
      {
        error: "Evidence registry API disabled",
        doc: "LDN Database Princeples/design/R1_EVIDENCE_REGISTRY_API.md",
      },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as EvidenceType | null;
  if (type && !["ldn", "soil", "drylands", "pressures", "interventions"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const pkg = await buildEvidenceRegistry({
      type: type ?? undefined,
      verification_status: searchParams.get("verification_status"),
      prais_eligible: searchParams.get("prais_eligible") === "true",
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
      offset: searchParams.get("offset")
        ? Number(searchParams.get("offset"))
        : undefined,
    });
    return NextResponse.json(pkg);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}