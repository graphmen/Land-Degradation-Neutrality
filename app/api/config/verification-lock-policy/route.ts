import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "verification-lock-policy.json"
  );
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      {
        error: "Lock policy not configured",
        doc: "LDN Database Princeples/design/VERIFICATION_LOCK_POLICY_V1.md",
      },
      { status: 404 }
    );
  }
}