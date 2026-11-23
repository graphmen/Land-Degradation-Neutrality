import { NextResponse } from "next/server";
import codeLists from "@/public/reference-code-lists.v0.9.json";

export const dynamic = "force-dynamic";

/** National code lists for mobile app and dashboard (Annex F). */
export async function GET() {
  return NextResponse.json(codeLists, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}