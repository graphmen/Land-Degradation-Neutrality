/**
 * EXP-SO1-SOC — Tier-2 field samples + Tier-1 national layer placeholder.
 */

import reportingConfig from "@/public/reporting-period-config.json";
import { DEFAULT_BASELINE_PERIOD_ID, CODE_LIST_VERSION } from "@/lib/compliance-metadata";
import { rowsToCsv } from "@/lib/exp-so1-field-export";
import { loadReconciledSoilRecords } from "@/lib/local-record-reconcile";

export const EXP_SO1_SOC_TIER2_COLUMNS = [
  "submission_id",
  "collect_earth_id",
  "lat",
  "lng",
  "depth_cm",
  "depth_range",
  "texture_class",
  "moisture_condition",
  "soc_percent",
  "lab_number",
  "data_tier",
  "verification_status",
  "reporting_period",
  "code_list_version",
] as const;

export type ExpSo1SocPackage = {
  package_id: "EXP-SO1-SOC";
  status: "tier2_partial" | "template_only";
  reporting_period: string | null;
  generated_at: string;
  tier1_national: Record<string, unknown>;
  tier2_samples: Record<string, unknown>[];
  csv: { tier2: string };
  stats: {
    tier2_total: number;
    tier2_depth_0_30: number;
    tier2_with_soc_value: number;
  };
  metadata: Record<string, unknown>;
};

function depthRange(depth: unknown): string | null {
  if (depth == null || depth === "") return null;
  const d = Number(depth);
  if (Number.isNaN(d)) return null;
  if (d <= 30) return "0-30";
  if (d <= 100) return "30-100";
  return "100+";
}

export async function buildExpSo1SocPackage(opts?: {
  reporting_period?: string | null;
}): Promise<ExpSo1SocPackage> {
  const reporting_period =
    opts?.reporting_period ??
    reportingConfig.periods?.find((p) => p.is_active)?.reporting_period ??
    null;

  const records = await loadReconciledSoilRecords();
  const tier2_samples = records.map((r) => {
    const samplList = Array.isArray(r.sampl) ? (r.sampl as Record<string, unknown>[]) : [];
    const first = samplList[0] ?? {};
    const rawDepth = r.depth_cm ?? first["sampl/dep"] ?? first.dep ?? null;
    const depth_cm =
      rawDepth != null && rawDepth !== "" && !Number.isNaN(Number(rawDepth))
        ? Number(rawDepth)
        : null;
    const rawSoc =
      r.soc_percent ??
      first.organic_carbon ??
      first["sampl/organic_carbon"] ??
      r.organic_carbon ??
      null;
    const soc =
      rawSoc != null && rawSoc !== "" && !Number.isNaN(Number(rawSoc))
        ? Number(rawSoc)
        : null;
    const labNumber =
      r.lab_number ?? first.lab_number ?? first["sampl/lab_number"] ?? null;
    const texture = r.texture ?? first["sampl/tex"] ?? first.tex ?? null;
    const moisture = r.moisture ?? first["sampl/moisture"] ?? first.moisture ?? null;
    const ceid = r.ceid ?? r["geninfo/ceid"] ?? null;

    return {
      submission_id: r.kobo_id ?? r.id ?? r._id,
      collect_earth_id: ceid,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      depth_cm,
      depth_range: depthRange(depth_cm),
      texture_class: texture,
      moisture_condition: moisture,
      soc_percent: soc,
      lab_number: labNumber,
      data_tier: soc != null ? "tier2_national" : r.data_tier ?? "field_verify",
      verification_status: r.verification_status ?? "submitted",
      reporting_period: r.reporting_period ?? null,
      code_list_version: r.code_list_version ?? CODE_LIST_VERSION,
    };
  });

  const tier2_depth_0_30 = tier2_samples.filter(
    (s) => s.depth_range === "0-30"
  ).length;
  const tier2_with_soc = tier2_samples.filter(
    (s) => s.soc_percent != null
  ).length;

  const status =
    tier2_with_soc > 0 ? "tier2_partial" : "template_only";

  const tier1_national = {
    source_layer_id: "SOC-NAT-SURFACE",
    data_tier: "tier1_default",
    depth_range: "0-30",
    area_km2: null,
    stock_tonnes: null,
    reporting_period,
    baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
    confidence: "low",
  };

  const generated_at = new Date().toISOString();

  return {
    package_id: "EXP-SO1-SOC",
    status,
    reporting_period,
    generated_at,
    tier1_national,
    tier2_samples,
    csv: {
      tier2: rowsToCsv(EXP_SO1_SOC_TIER2_COLUMNS, tier2_samples),
    },
    stats: {
      tier2_total: tier2_samples.length,
      tier2_depth_0_30,
      tier2_with_soc_value: tier2_with_soc,
    },
    metadata: {
      package_id: "EXP-SO1-SOC",
      title: "Soil organic carbon — Tier-2 samples + national Tier-1 placeholder",
      status,
      reporting_period,
      generated_at,
      methods:
        "Tier-2: soil cores with depth_cm; link lab SOC when available. Tier-1: national SOC surface when SOC-NAT-SURFACE loaded.",
      import_plan:
        "LDN Database Princeples/corpus/metadata/SOC-NAT-SURFACE_IMPORT_PLAN.md",
      steering_decision: "S12",
      tier1_source_layer_id: tier1_national.source_layer_id,
      depth_0_30_documented: tier2_depth_0_30 === tier2_samples.length,
    },
  };
}