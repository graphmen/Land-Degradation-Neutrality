import fs from "fs/promises";
import path from "path";
import reportingConfig from "@/public/reporting-period-config.json";
import {
  EXP_SO1_LDN_COLUMNS,
  EXP_SO1_SOIL_COLUMNS,
  mapLdnToExpSo1Field,
  mapSoilToExpSo1Field,
} from "@/lib/exp-so1-field-mapper";
import {
  loadReconciledLdnRecords,
  loadReconciledSoilRecords,
} from "@/lib/local-record-reconcile";

export type EligibilityMode = "locked" | "approved" | "rehearsal" | "all";

const ELIGIBILITY_STATUSES: Record<EligibilityMode, Set<string>> = {
  locked: new Set(["locked"]),
  approved: new Set(["approved", "locked"]),
  rehearsal: new Set(["approved", "locked"]),
  all: new Set([
    "draft",
    "submitted",
    "district_review",
    "national_review",
    "approved",
    "locked",
    "rejected",
    "superseded",
  ]),
};

export function csvEscape(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(
  columns: readonly string[],
  rows: Record<string, unknown>[]
): string {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((col) => csvEscape(row[col])).join(",")
  );
  return [header, ...lines].join("\n");
}

export type ExpSo1FieldPackage = {
  package_id: "EXP-SO1-FIELD";
  reporting_period: string | null;
  eligibility: EligibilityMode;
  generated_at: string;
  ldn: Record<string, unknown>[];
  soil: Record<string, unknown>[];
  csv: { ldn: string; soil: string };
  stats: {
    ldn_total: number;
    ldn_exported: number;
    soil_total: number;
    soil_exported: number;
  };
  metadata: Record<string, unknown>;
};

function passesEligibility(
  record: Record<string, unknown>,
  mode: EligibilityMode,
  reporting_period?: string | null
): boolean {
  const status = String(record.verification_status ?? "submitted");
  if (!ELIGIBILITY_STATUSES[mode].has(status)) return false;
  if (mode === "locked" && reporting_period) {
    const rp = record.reporting_period;
    if (rp != null && String(rp) !== reporting_period) return false;
  }
  return true;
}

export async function buildExpSo1FieldPackage(opts: {
  eligibility?: EligibilityMode;
  reporting_period?: string | null;
}): Promise<ExpSo1FieldPackage> {
  const eligibility = opts.eligibility ?? "rehearsal";
  const activePeriod =
    opts.reporting_period ??
    reportingConfig.periods?.find((p) => p.is_active)?.reporting_period ??
    null;

  const ldnAll = await loadReconciledLdnRecords();
  const soilAll = await loadReconciledSoilRecords();

  const ldnFiltered = ldnAll.filter((r) =>
    passesEligibility(r, eligibility, activePeriod)
  );
  const soilFiltered = soilAll.filter((r) =>
    passesEligibility(r, eligibility, activePeriod)
  );

  const ldn = ldnFiltered.map(mapLdnToExpSo1Field);
  const soil = soilFiltered.map(mapSoilToExpSo1Field);

  const generated_at = new Date().toISOString();

  return {
    package_id: "EXP-SO1-FIELD",
    reporting_period: activePeriod,
    eligibility,
    generated_at,
    ldn,
    soil,
    csv: {
      ldn: rowsToCsv(EXP_SO1_LDN_COLUMNS, ldn),
      soil: rowsToCsv(EXP_SO1_SOIL_COLUMNS, soil),
    },
    stats: {
      ldn_total: ldnAll.length,
      ldn_exported: ldn.length,
      soil_total: soilAll.length,
      soil_exported: soil.length,
    },
    metadata: {
      package_id: "EXP-SO1-FIELD",
      title: "LDN + soil field evidence for SO1 QA",
      custodian: "Environmental Management Agency",
      reporting_period: activePeriod,
      eligibility,
      generated_at,
      code_list_version: ldn[0]?.code_list_version ?? "0.9-draft",
      methods:
        "Annex E §E.5 minimum columns; UNCCD class via reference-code-lists v0.9",
      confidence: eligibility === "locked" ? "high" : "medium",
      stats: {
        ldn_exported: ldn.length,
        soil_exported: soil.length,
      },
    },
  };
}

export async function writeExpSo1FieldToDisk(
  pkg: ExpSo1FieldPackage,
  baseDir?: string
): Promise<string> {
  const period = pkg.reporting_period ?? "unassigned";
  const outDir = path.join(
    process.cwd(),
    baseDir ?? "exports",
    period,
    "EXP-SO1-FIELD",
    pkg.generated_at.replace(/[:.]/g, "-")
  );
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "ldn_field.csv"), pkg.csv.ldn, "utf-8");
  await fs.writeFile(path.join(outDir, "soil_field.csv"), pkg.csv.soil, "utf-8");
  await fs.writeFile(
    path.join(outDir, "metadata.json"),
    JSON.stringify(pkg.metadata, null, 2),
    "utf-8"
  );
  return outDir;
}