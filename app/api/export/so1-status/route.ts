import { NextResponse } from "next/server";
import {
  buildExpSo1StatusPackage,
  writeExpSo1StatusToDisk,
} from "@/lib/exp-so1-status-export";

export const dynamic = "force-dynamic";

/** GET /api/export/so1-status — national LD class zonal stats (EXP-SO1-STATUS stub). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reporting_period = searchParams.get("reporting_period");
    const format = searchParams.get("format") ?? "json";
    const write = searchParams.get("write") === "1";

    const pkg = await buildExpSo1StatusPackage({ reporting_period });

    if (write) {
      const outDir = await writeExpSo1StatusToDisk(pkg);
      pkg.metadata = { ...pkg.metadata, output_path: outDir };
    }

    if (format === "csv") {
      return new NextResponse(pkg.csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="exp-so1-status.csv"`,
        },
      });
    }

    return NextResponse.json(pkg);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}