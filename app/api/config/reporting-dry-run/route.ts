import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "reporting-desk-dry-run.json"
  );
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      {
        error: "Reporting desk dry-run not generated",
        hint: "npm run reporting:dry-run",
        doc: "LDN Database Princeples/design/R1_REPORTING_DESK_MODULE.md",
      },
      { status: 404 }
    );
  }
}