import { NextResponse } from "next/server";
import {
  buildExpSo1FieldPackage,
  writeExpSo1FieldToDisk,
  type EligibilityMode,
} from "@/lib/exp-so1-field-export";

export const dynamic = "force-dynamic";

const ELIGIBILITY = new Set<EligibilityMode>([
  "locked",
  "approved",
  "rehearsal",
  "all",
]);

function parseEligibility(raw: string | null): EligibilityMode {
  if (raw && ELIGIBILITY.has(raw as EligibilityMode)) {
    return raw as EligibilityMode;
  }
  return "rehearsal";
}

/**
 * GET /api/export/so1-field — Annex E EXP-SO1-FIELD package (JSON or CSV download).
 * Query: eligibility=locked|approved|rehearsal|all, reporting_period=, format=json|csv_ldn|csv_soil, write=1
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eligibility = parseEligibility(searchParams.get("eligibility"));
    const reporting_period = searchParams.get("reporting_period");
    const format = searchParams.get("format") ?? "json";
    const write = searchParams.get("write") === "1";

    const pkg = await buildExpSo1FieldPackage({
      eligibility,
      reporting_period,
    });

    if (write) {
      const outDir = await writeExpSo1FieldToDisk(pkg);
      pkg.metadata = { ...pkg.metadata, output_path: outDir };
    }

    if (format === "csv_ldn") {
      return new NextResponse(pkg.csv.ldn, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="exp-so1-field-ldn.csv"`,
        },
      });
    }
    if (format === "csv_soil") {
      return new NextResponse(pkg.csv.soil, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="exp-so1-field-soil.csv"`,
        },
      });
    }

    return NextResponse.json(pkg);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}