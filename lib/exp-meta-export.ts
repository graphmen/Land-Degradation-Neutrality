import fs from "fs/promises";
import path from "path";
import reportingConfig from "@/public/reporting-period-config.json";
import { CODE_LIST_VERSION, DEFAULT_BASELINE_PERIOD_ID } from "@/lib/compliance-metadata";
import { buildCorpusManifest, validateManifestF1, type CorpusLayerRow } from "@/lib/corpus-manifest";
import { csvEscape, rowsToCsv } from "@/lib/exp-so1-field-export";

export const EXP_META_COLUMNS = [
  "layer_id",
  "title",
  "custodian",
  "vintage",
  "geometry_type",
  "feature_count",
  "crs",
  "data_tier",
  "confidence",
  "import_status",
  "so_uses",
  "doc_path",
] as const;

export type ExpMetaPackage = {
  package_id: "EXP-META";
  reporting_period: string | null;
  generated_at: string;
  layers: CorpusLayerRow[];
  csv: string;
  validation: { f1_pass: boolean; f1_missing: string[] };
  prais_annex_ii_note: string;
  metadata: Record<string, unknown>;
};

export async function buildExpMetaPackage(opts?: {
  reporting_period?: string | null;
}): Promise<ExpMetaPackage> {
  const reporting_period =
    opts?.reporting_period ??
    reportingConfig.periods?.find((p) => p.is_active)?.reporting_period ??
    null;

  const layers = buildCorpusManifest();
  const validation = validateManifestF1(layers);
  const generated_at = new Date().toISOString();

  const metadata = {
    package_id: "EXP-META",
    title: "National LDN data corpus — metadata manifest",
    custodian: "Environmental Management Agency",
    reporting_period,
    baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
    generated_at,
    code_list_version: CODE_LIST_VERSION,
    layer_count: layers.length,
    methods:
      "Corpus register rows + QC-derived feature counts; PRAIS Annex II fields per layer completed at steering.",
    confidence: "medium",
    steering: [
      "Complete prais_alternative_dataset per layer replacing PRAIS defaults",
      "Assign contact per layer before lock",
    ],
  };

  return {
    package_id: "EXP-META",
    reporting_period,
    generated_at,
    layers,
    csv: rowsToCsv(
      EXP_META_COLUMNS,
      layers as unknown as Record<string, unknown>[]
    ),
    validation: {
      f1_pass: validation.pass,
      f1_missing: validation.missing,
    },
    prais_annex_ii_note:
      "Full Annex II citations live in per-layer YAML (e.g. LDN-NAT-ALL_METADATA.yaml) when national data replaces defaults.",
    metadata,
  };
}

export async function writeExpMetaToDisk(pkg: ExpMetaPackage): Promise<string> {
  const period = pkg.reporting_period ?? "unassigned";
  const outDir = path.join(
    process.cwd(),
    "exports",
    period,
    "EXP-META",
    pkg.generated_at.replace(/[:.]/g, "-")
  );
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "corpus_layers.csv"), pkg.csv, "utf-8");
  await fs.writeFile(
    path.join(outDir, "metadata.json"),
    JSON.stringify(pkg.metadata, null, 2),
    "utf-8"
  );
  await fs.writeFile(
    path.join(outDir, "corpus_layers.json"),
    JSON.stringify(pkg.layers, null, 2),
    "utf-8"
  );
  return outDir;
}