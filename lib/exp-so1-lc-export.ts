/**
 * EXP-SO1-LC stub — 7×7 transition template until national LC rasters registered.
 * See design/SO1_LC_TRANSITION_MATRIX.md
 */

import { DEFAULT_BASELINE_PERIOD_ID } from "@/lib/compliance-metadata";
import reportingConfig from "@/public/reporting-period-config.json";
import { csvEscape, rowsToCsv } from "@/lib/exp-so1-field-export";

const UNCCD_CLASSES = [
  "tree_covered",
  "grassland",
  "cropland",
  "wetland",
  "artificial",
  "other_land",
  "water",
] as const;

export const EXP_SO1_LC_COLUMNS = [
  "from_unccd_class",
  "to_unccd_class",
  "area_km2",
  "baseline_period_id",
  "reporting_period",
  "data_tier",
  "source_layer_id",
  "confidence",
] as const;

export type ExpSo1LcPackage = {
  package_id: "EXP-SO1-LC";
  status: "template_only";
  reporting_period: string | null;
  generated_at: string;
  rows: Record<string, unknown>[];
  csv: string;
  metadata: Record<string, unknown>;
};

export function buildExpSo1LcTemplate(opts?: {
  reporting_period?: string | null;
}): ExpSo1LcPackage {
  const reporting_period =
    opts?.reporting_period ??
    reportingConfig.periods?.find((p) => p.is_active)?.reporting_period ??
    null;

  const rows: Record<string, unknown>[] = [];
  for (const from of UNCCD_CLASSES) {
    for (const to of UNCCD_CLASSES) {
      rows.push({
        from_unccd_class: from,
        to_unccd_class: to,
        area_km2: null,
        baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
        reporting_period,
        data_tier: "tier1_default",
        source_layer_id: "LC-NAT-STACK",
        confidence: "low",
      });
    }
  }

  const generated_at = new Date().toISOString();

  return {
    package_id: "EXP-SO1-LC",
    status: "template_only",
    reporting_period,
    generated_at,
    rows,
    csv: rowsToCsv(EXP_SO1_LC_COLUMNS, rows),
    metadata: {
      package_id: "EXP-SO1-LC",
      title: "Land cover transition matrix (template)",
      status: "template_only",
      reporting_period,
      baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
      generated_at,
      methods:
        "Populate area_km2 from national LC zonal stats when LC-NAT-STACK loaded.",
      import_plan:
        "LDN Database Princeples/corpus/metadata/LC-NAT-STACK_IMPORT_PLAN.md",
      steering_decision: "S10",
      row_count: rows.length,
    },
  };
}