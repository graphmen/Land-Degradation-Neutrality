import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sitesStatic from "@/public/reference-monitoring-sites.json";

export const dynamic = "force-dynamic";

const dataPath = path.join(process.cwd(), "public", "reference-monitoring-sites.json");

export async function GET() {
  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(sitesStatic);
  }
}