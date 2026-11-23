import { NextResponse } from "next/server";
import { buildExpSo1SocPackage } from "@/lib/exp-so1-soc-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";
  const pkg = await buildExpSo1SocPackage({
    reporting_period: searchParams.get("reporting_period"),
  });
  if (format === "csv_tier2") {
    return new NextResponse(pkg.csv.tier2, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exp-so1-soc-tier2.csv"`,
      },
    });
  }
  return NextResponse.json(pkg);
}