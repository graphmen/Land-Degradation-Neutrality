import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const filePath = path.join(process.cwd(), "public", "s2-migration-preflight.json");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      {
        error: "Preflight not generated",
        hint: "npm run s2:preflight",
        doc: "backend/S2_APPLY_PREFLIGHT.md",
      },
      { status: 404 }
    );
  }
}