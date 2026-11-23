import { NextResponse } from "next/server";
import { buildNationalOverview } from "@/lib/national-overview";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (process.env.ENABLE_NATIONAL_OVERVIEW_API === "false") {
    return NextResponse.json(
      {
        error: "National overview API disabled",
        hint: "Set ENABLE_NATIONAL_OVERVIEW_API=true for R2 rehearsal",
        doc: "LDN Database Princeples/R1_INFORMATION_ARCHITECTURE.md",
      },
      { status: 404 }
    );
  }

  try {
    const payload = await buildNationalOverview();
    return NextResponse.json(payload);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}