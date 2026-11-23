import { NextResponse } from "next/server";
import { buildExpPhotosPackage } from "@/lib/exp-photos-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";
  const locked = searchParams.get("locked") === "1";
  const pkg = await buildExpPhotosPackage({
    reporting_period: searchParams.get("reporting_period"),
    locked_only: locked,
  });
  if (format === "csv") {
    return new NextResponse(pkg.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exp-photos-manifest.csv"`,
      },
    });
  }
  return NextResponse.json(pkg);
}