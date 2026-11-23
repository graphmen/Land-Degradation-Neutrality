/**
 * EXP-SO1-LPD stub — zonal LPD summary until national LPD raster registered.
 */

import { DEFAULT_BASELINE_PERIOD_ID } from "@/lib/compliance-metadata";
import reportingConfig from "@/public/reporting-period-config.json";
import { rowsToCsv } from "@/lib/exp-so1-field-export";

/** GPG / Trends.Earth-style productivity dynamics (simplified). */
const LPD_CLASSES = [
  "declining",
  "stable",
  "increasing",
  "not_assessed",
] as const;

export const EXP_SO1_LPD_COLUMNS = [
  "lpd_class",
  "area_km2",
  "area_percent",
  "baseline_period_id",
  "reporting_period",
  "data_tier",
  "source_layer_id",
  "confidence",
] as const;

export type ExpSo1LpdPackage = {
  package_id: "EXP-SO1-LPD";
  status: "template_only";
  reporting_period: string | null;
  generated_at: string;
  rows: Record<string, unknown>[];
  csv: string;
  metadata: Record<string, unknown>;
};

export function buildExpSo1LpdTemplate(opts?: {
  reporting_period?: string | null;
}): ExpSo1LpdPackage {
  const reporting_period =
    opts?.reporting_period ??
    reportingConfig.periods?.find((p) => p.is_active)?.reporting_period ??
    null;

  const rows = LPD_CLASSES.map((lpd_class) => ({
    lpd_class,
    area_km2: null,
    area_percent: null,
    baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
    reporting_period,
    data_tier: "tier1_default",
    source_layer_id: "LPD-NAT-RASTER",
    confidence: "low",
  }));

  const generated_at = new Date().toISOString();

  return {
    package_id: "EXP-SO1-LPD",
    status: "template_only",
    reporting_period,
    generated_at,
    rows,
    csv: rowsToCsv(EXP_SO1_LPD_COLUMNS, rows),
    metadata: {
      package_id: "EXP-SO1-LPD",
      title: "Land productivity dynamics zonal summary (template)",
      status: "template_only",
      reporting_period,
      baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
      generated_at,
      methods:
        "Populate from national LPD raster zonal stats when LPD-NAT-RASTER loaded.",
      import_plan:
        "LDN Database Princeples/corpus/metadata/LPD-NAT-RASTER_IMPORT_PLAN.md",
      steering_decision: "S11",
      lpd_class_count: rows.length,
    },
  };
}