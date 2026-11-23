import { NextResponse } from "next/server";
import { buildExpSo1LpdTemplate } from "@/lib/exp-so1-lpd-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";
  const pkg = buildExpSo1LpdTemplate({
    reporting_period: searchParams.get("reporting_period"),
  });
  if (format === "csv") {
    return new NextResponse(pkg.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exp-so1-lpd-template.csv"`,
      },
    });
  }
  return NextResponse.json(pkg);
}