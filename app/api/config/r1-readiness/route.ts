import { NextResponse } from "next/server";
import { buildR1Readiness } from "@/lib/r1-readiness";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const pkg = await buildR1Readiness();
    return NextResponse.json(pkg);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}