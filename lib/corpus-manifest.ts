/**
 * Living corpus manifest — keep aligned with CORPUS_METADATA_REGISTER.md.
 * Feature counts prefer QC JSON when present.
 */

import pressureQc from "@/public/qc-pressure-layers-report.json";
import interventionQc from "@/public/qc-intervention-spatial-report.json";
import nationalSummary from "@/public/national-ldn-status-summary.json";

export type CorpusLayerRow = {
  layer_id: string;
  title: string;
  custodian: string;
  vintage: string;
  geometry_type: string;
  feature_count: number | null;
  crs: string;
  data_tier: string;
  so_uses: string[];
  import_status: string;
  confidence: "high" | "medium" | "low";
  doc_path: string;
  contact?: string;
  abstract?: string;
};

function invasiveCount(): number {
  const pkg = pressureQc.packages?.find((p) => p.layer_id === "PRESS-INVASIVE");
  const layer = pkg?.layers?.find((l) =>
    String(l.layer).includes("LatLong")
  );
  return layer?.features ?? 2035;
}

function miningCount(): number {
  const pkg = pressureQc.packages?.find((p) => p.layer_id === "PRESS-MINING");
  const layer = pkg?.layers?.find((l) =>
    String(l.layer).includes("LatLong")
  );
  return layer?.features ?? 769;
}

function sbcCount(): number {
  const pkg = interventionQc.packages?.find((p) => p.layer_id === "INT-SBC");
  return (
    (pkg as { authoritative_feature_count?: number })?.authoritative_feature_count ??
    1367
  );
}

function projectsCount(): number {
  const pkg = interventionQc.packages?.find((p) => p.layer_id === "INT-PROJECTS");
  return (
    (pkg as { authoritative_feature_count?: number })?.authoritative_feature_count ??
    47
  );
}

export function buildCorpusManifest(): CorpusLayerRow[] {
  const natPolygons =
    (nationalSummary as { polygon_count?: number }).polygon_count ?? 254873;

  return [
    {
      layer_id: "LC-NAT-STACK",
      title: "National land cover stack (t₀/t₁)",
      custodian: "Environmental Management Agency",
      vintage: "pending_T1",
      geometry_type: "Raster",
      feature_count: null,
      crs: "EPSG:4326",
      data_tier: "tier1_default",
      so_uses: ["SO1-1"],
      import_status: "awaiting_delivery",
      confidence: "low",
      doc_path:
        "LDN Database Princeples/corpus/metadata/LC-NAT-STACK_IMPORT_PLAN.md",
      abstract:
        "Paired UNCCD 7-class surfaces for transition matrix; steering T1–T4 before load.",
    },
    {
      layer_id: "LPD-NAT-RASTER",
      title: "National land productivity dynamics (LPD)",
      custodian: "Environmental Management Agency",
      vintage: "pending_S11",
      geometry_type: "Raster",
      feature_count: null,
      crs: "EPSG:4326",
      data_tier: "tier1_default",
      so_uses: ["SO1-2"],
      import_status: "awaiting_delivery",
      confidence: "low",
      doc_path:
        "LDN Database Princeples/corpus/metadata/LPD-NAT-RASTER_IMPORT_PLAN.md",
      abstract: "LPD class zonal summary; steering S11 before PRAIS SO1-2.",
    },
    {
      layer_id: "SOC-NAT-SURFACE",
      title: "National SOC surface (0–30 cm)",
      custodian: "Environmental Management Agency",
      vintage: "pending_S12",
      geometry_type: "Raster",
      feature_count: null,
      crs: "EPSG:4326",
      data_tier: "tier1_default",
      so_uses: ["SO1-3"],
      import_status: "awaiting_delivery",
      confidence: "low",
      doc_path:
        "LDN Database Princeples/corpus/metadata/SOC-NAT-SURFACE_IMPORT_PLAN.md",
      abstract:
        "Tier-1 SOC national layer; Tier-2 FIELD-SOIL cores complement SO1-3.",
    },
    {
      layer_id: "LDN-NAT-ALL",
      title: "Combined LDN validation polygons",
      custodian: "Environmental Management Agency",
      vintage: "2026-11",
      geometry_type: "Polygon",
      feature_count: natPolygons,
      crs: "EPSG:4326",
      data_tier: "tier2_national",
      so_uses: ["SO1-1", "SO1-4 context"],
      import_status: "plan_only",
      confidence: "medium",
      doc_path: "LDN Database Princeples/corpus/metadata/LDN-NAT-ALL_IMPORT_PLAN.md",
      abstract:
        "National LD class polygons; Area unit and CEID join pending EMA steering.",
    },
    {
      layer_id: "LDN-PROV-*",
      title: "Provincial LDN shapefile splits",
      custodian: "Environmental Management Agency",
      vintage: "2026-11",
      geometry_type: "Polygon",
      feature_count: null,
      crs: "EPSG:4326",
      data_tier: "tier2_national",
      so_uses: ["SO1 QA"],
      import_status: "not_started",
      confidence: "low",
      doc_path: "LDN Database Princeples/ANNEX_C_SPATIAL_LAYERS_REGISTER.md",
    },
    {
      layer_id: "REF-SITES",
      title: "Existing monitoring sites",
      custodian: "Environmental Management Agency",
      vintage: "2026-11",
      geometry_type: "Point",
      feature_count: 28,
      crs: "EPSG:4326",
      data_tier: "field_verify",
      so_uses: ["Operations"],
      import_status: "json_loaded",
      confidence: "medium",
      doc_path: "public/reference-monitoring-sites.json",
    },
    {
      layer_id: "INT-PROJECTS",
      title: "EMA restoration projects",
      custodian: "Environmental Management Agency",
      vintage: "2026-11",
      geometry_type: "Point",
      feature_count: projectsCount(),
      crs: "EPSG:4326",
      data_tier: "tier2_national",
      so_uses: ["SO4"],
      import_status: "staging_json",
      confidence: "medium",
      doc_path: "LDN Database Princeples/corpus/metadata/INTERVENTION_SPATIAL_QC.md",
    },
    {
      layer_id: "INT-SBC",
      title: "Soil & water conservation points",
      custodian: "Environmental Management Agency",
      vintage: "2026-11",
      geometry_type: "Point",
      feature_count: sbcCount(),
      crs: "EPSG:4326",
      data_tier: "tier2_national",
      so_uses: ["Restoration", "SO4"],
      import_status: "qc_only",
      confidence: "medium",
      doc_path: "LDN Database Princeples/corpus/metadata/INT-SBC_IMPORT_PLAN.md",
    },
    {
      layer_id: "PRESS-INVASIVE",
      title: "Invasive species observations",
      custodian: "Environmental Management Agency",
      vintage: "2026-11",
      geometry_type: "Point",
      feature_count: invasiveCount(),
      crs: "EPSG:4326",
      data_tier: "tier2_national",
      so_uses: ["SO1-2"],
      import_status: "staging_json",
      confidence: "medium",
      doc_path: "LDN Database Princeples/corpus/metadata/PRESS-INVASIVE_IMPORT_PLAN.md",
    },
    {
      layer_id: "PRESS-MINING",
      title: "Illegal panning / mining points",
      custodian: "Environmental Management Agency",
      vintage: "2026-11",
      geometry_type: "Point",
      feature_count: miningCount(),
      crs: "EPSG:4326",
      data_tier: "tier2_national",
      so_uses: ["SO2"],
      import_status: "staging_json",
      confidence: "medium",
      doc_path: "LDN Database Princeples/corpus/metadata/PRESS-MINING_IMPORT_PLAN.md",
    },
    {
      layer_id: "FIELD-LDN",
      title: "LDN field validations",
      custodian: "Environmental Management Agency",
      vintage: "rolling",
      geometry_type: "Point",
      feature_count: 150,
      crs: "WGS84",
      data_tier: "field_verify",
      so_uses: ["SO1 verify"],
      import_status: "etl_complete",
      confidence: "high",
      doc_path: "LDN Database Princeples/ANNEX_A_FIELD_MAPPING.md",
    },
    {
      layer_id: "FIELD-SOIL",
      title: "Soil core surveys",
      custodian: "Environmental Management Agency",
      vintage: "rolling",
      geometry_type: "Point",
      feature_count: 632,
      crs: "WGS84",
      data_tier: "field_verify",
      so_uses: ["SO1-3"],
      import_status: "partial",
      confidence: "medium",
      doc_path: "LDN Database Princeples/ANNEX_A_FIELD_MAPPING.md",
    },
    {
      layer_id: "FIELD-DRY",
      title: "Drylands ILUP observations",
      custodian: "Environmental Management Agency",
      vintage: "rolling",
      geometry_type: "Point",
      feature_count: 16,
      crs: "WGS84",
      data_tier: "field_verify",
      so_uses: ["ILUP"],
      import_status: "partial",
      confidence: "medium",
      doc_path: "LDN Database Princeples/ANNEX_B_DRYLANDS_FIELD_MAPPING.md",
    },
  ];
}

export function validateManifestF1(rows: CorpusLayerRow[]): {
  pass: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  for (const row of rows) {
    if (!row.custodian?.trim()) missing.push(`${row.layer_id}: custodian`);
    if (!row.vintage?.trim()) missing.push(`${row.layer_id}: vintage`);
  }
  return { pass: missing.length === 0, missing };
}