import { NextResponse } from "next/server";
import { buildExpMetaPackage, writeExpMetaToDisk } from "@/lib/exp-meta-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "json";
    const write = searchParams.get("write") === "1";
    const pkg = await buildExpMetaPackage({
      reporting_period: searchParams.get("reporting_period"),
    });
    if (write) {
      const outDir = await writeExpMetaToDisk(pkg);
      pkg.metadata = { ...pkg.metadata, output_path: outDir };
    }
    if (format === "csv") {
      return new NextResponse(pkg.csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="exp-meta-corpus.csv"`,
        },
      });
    }
    return NextResponse.json(pkg);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}