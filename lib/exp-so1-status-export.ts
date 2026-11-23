import fs from "fs/promises";
import path from "path";
import reportingConfig from "@/public/reporting-period-config.json";
import statusSummary from "@/public/national-ldn-status-summary.json";
import { DEFAULT_BASELINE_PERIOD_ID, CODE_LIST_VERSION } from "@/lib/compliance-metadata";
import { csvEscape, rowsToCsv } from "@/lib/exp-so1-field-export";

export const EXP_SO1_STATUS_COLUMNS = [
  "reporting_period",
  "baseline_period_id",
  "data_tier",
  "ld_class",
  "polygon_count",
  "area_sum",
  "area_unit",
  "area_percent",
  "confidence",
  "source_layer_id",
] as const;

type StatusRow = {
  reporting_period: string | null;
  baseline_period_id: string;
  data_tier: string;
  ld_class: string;
  polygon_count: number;
  area_sum: number;
  area_unit: string | null;
  area_percent: number;
  confidence: string;
  source_layer_id: string;
};

export type ExpSo1StatusPackage = {
  package_id: "EXP-SO1-STATUS";
  reporting_period: string | null;
  generated_at: string;
  rows: StatusRow[];
  csv: string;
  summary: {
    polygon_count: number;
    area_total: number;
    area_unit: string | null;
    degraded_area_percent: number | null;
  };
  metadata: Record<string, unknown>;
};

export async function buildExpSo1StatusPackage(opts?: {
  reporting_period?: string | null;
}): Promise<ExpSo1StatusPackage> {
  const reporting_period =
    opts?.reporting_period ??
    reportingConfig.periods?.find((p) => p.is_active)?.reporting_period ??
    null;

  const byClass = (statusSummary as { by_ld_class?: { ld_class: string; polygon_count: number; area_sum: number; area_percent: number }[] }).by_ld_class ?? [];
  const polygon_count = (statusSummary as { polygon_count?: number }).polygon_count ?? 0;
  const area_total = (statusSummary as { area_total?: number }).area_total ?? 0;
  const area_unit = (statusSummary as { area_unit?: string | null }).area_unit ?? null;

  const rows: StatusRow[] = byClass.map((r) => ({
    reporting_period,
    baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
    data_tier: "tier2_national",
    ld_class: r.ld_class,
    polygon_count: r.polygon_count,
    area_sum: r.area_sum,
    area_unit,
    area_percent: r.area_percent,
    confidence: area_unit ? "high" : "medium",
    source_layer_id: "LDN-NAT-ALL",
  }));

  const degraded = byClass.find((r) => r.ld_class.toLowerCase() === "degraded");

  const generated_at = new Date().toISOString();

  const metadata = {
    package_id: "EXP-SO1-STATUS",
    title: "National LDN unit status summary (LD class zonal stats)",
    custodian: "Environmental Management Agency",
    reporting_period,
    baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
    generated_at,
    methods:
      "Zonal sum of shapefile Area by LD; not a substitute for GPG 1OAO until LC+LPD+SOC national run.",
    one_ao_ready: false,
    code_list_version: CODE_LIST_VERSION,
    source: (statusSummary as { shapefile?: string }).shapefile,
    confidence: area_unit ? "high" : "medium",
  };

  return {
    package_id: "EXP-SO1-STATUS",
    reporting_period,
    generated_at,
    rows,
    csv: rowsToCsv(EXP_SO1_STATUS_COLUMNS, rows as unknown as Record<string, unknown>[]),
    summary: {
      polygon_count,
      area_total,
      area_unit,
      degraded_area_percent: degraded?.area_percent ?? null,
    },
    metadata,
  };
}

export async function writeExpSo1StatusToDisk(pkg: ExpSo1StatusPackage): Promise<string> {
  const period = pkg.reporting_period ?? "unassigned";
  const outDir = path.join(
    process.cwd(),
    "exports",
    period,
    "EXP-SO1-STATUS",
    pkg.generated_at.replace(/[:.]/g, "-")
  );
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "status_by_ld_class.csv"), pkg.csv, "utf-8");
  await fs.writeFile(
    path.join(outDir, "metadata.json"),
    JSON.stringify(pkg.metadata, null, 2),
    "utf-8"
  );
  return outDir;
}