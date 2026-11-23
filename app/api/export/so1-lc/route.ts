import { NextResponse } from "next/server";
import { buildExpSo1LcTemplate } from "@/lib/exp-so1-lc-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";
  const pkg = buildExpSo1LcTemplate({
    reporting_period: searchParams.get("reporting_period"),
  });
  if (format === "csv") {
    return new NextResponse(pkg.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exp-so1-lc-template.csv"`,
      },
    });
  }
  return NextResponse.json(pkg);
}