import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const filePath = path.join(process.cwd(), "public", "qc-programme-summary.json");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: message,
        hint: "Run npm run qc:summary",
        doc: "LDN Database Princeples/corpus/CORPUS_QC_LINEAGE.md",
      },
      { status: 404 }
    );
  }
}