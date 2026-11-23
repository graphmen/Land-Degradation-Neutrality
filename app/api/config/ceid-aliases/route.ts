import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "reference-ceid-aliases.v0.1.json"
  );
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      {
        error: "CEID alias register missing",
        hint: "npm run build:ceid-aliases",
        doc: "LDN Database Princeples/design/CEID_ALIAS_REGISTER.md",
      },
      { status: 404 }
    );
  }
}