import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { buildExpMetaPackage, writeExpMetaToDisk } from "@/lib/exp-meta-export";
import {
  buildExpSo1FieldPackage,
  writeExpSo1FieldToDisk,
  type EligibilityMode,
} from "@/lib/exp-so1-field-export";
import { buildExpSo1LcTemplate } from "@/lib/exp-so1-lc-export";
import { buildExpSo1LpdTemplate } from "@/lib/exp-so1-lpd-export";
import { buildExpSo1SocPackage } from "@/lib/exp-so1-soc-export";
import { buildExpSo1StatusPackage, writeExpSo1StatusToDisk } from "@/lib/exp-so1-status-export";

async function sha256File(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

async function sha256Text(text: string): Promise<string> {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function writeCsvBundle(
  root: string,
  sub: string,
  name: string,
  csv: string,
  metadata: Record<string, unknown>
): Promise<{ dir: string; csv_path: string; hash: string }> {
  const dir = path.join(root, sub);
  await fs.mkdir(dir, { recursive: true });
  const csvPath = path.join(dir, name);
  await fs.writeFile(csvPath, csv, "utf-8");
  await fs.writeFile(
    path.join(dir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );
  return { dir, csv_path: csvPath, hash: await sha256File(csvPath) };
}

export type ReportingBundleResult = {
  bundle_id: string;
  reporting_period: string | null;
  root_dir: string;
  generated_at: string;
  eligibility: EligibilityMode;
  packages: Record<string, { path: string; sha256: string }>;
  manifest_path: string;
  rehearsal_note: string;
};

export async function buildAndWriteReportingBundle(opts?: {
  reporting_period?: string | null;
  eligibility?: EligibilityMode;
  /** If true, field export uses `all` rows (dry-run); official uses `locked`. */
  rehearsal?: boolean;
}): Promise<ReportingBundleResult> {
  const rehearsal = opts?.rehearsal ?? true;
  const eligibility: EligibilityMode = opts?.eligibility ?? (rehearsal ? "all" : "locked");

  const [meta, field, status, soc] = await Promise.all([
    buildExpMetaPackage({ reporting_period: opts?.reporting_period }),
    buildExpSo1FieldPackage({
      reporting_period: opts?.reporting_period,
      eligibility,
    }),
    buildExpSo1StatusPackage({ reporting_period: opts?.reporting_period }),
    buildExpSo1SocPackage({ reporting_period: opts?.reporting_period }),
  ]);

  const lc = buildExpSo1LcTemplate({ reporting_period: opts?.reporting_period });
  const lpd = buildExpSo1LpdTemplate({ reporting_period: opts?.reporting_period });

  const reporting_period =
    meta.reporting_period ?? status.reporting_period ?? "unassigned";
  const generated_at = new Date().toISOString();
  const bundle_id = `BUNDLE-${generated_at.replace(/[:.]/g, "-")}`;
  const root_dir = path.join(
    process.cwd(),
    "exports",
    reporting_period,
    bundle_id
  );
  await fs.mkdir(root_dir, { recursive: true });

  const packages: Record<string, { path: string; sha256: string }> = {};

  const metaDir = await writeExpMetaToDisk(meta);
  packages.EXP_META = {
    path: metaDir,
    sha256: await sha256File(path.join(metaDir, "corpus_layers.csv")),
  };

  const fieldDir = await writeExpSo1FieldToDisk(field);
  packages.EXP_SO1_FIELD = {
    path: fieldDir,
    sha256: await sha256Text(field.csv.ldn),
  };

  const statusDir = await writeExpSo1StatusToDisk(status);
  packages.EXP_SO1_STATUS = {
    path: statusDir,
    sha256: await sha256File(path.join(statusDir, "status_by_ld_class.csv")),
  };

  const lcOut = await writeCsvBundle(
    root_dir,
    "EXP-SO1-LC",
    "transitions_km2.csv",
    lc.csv,
    lc.metadata
  );
  packages.EXP_SO1_LC = { path: lcOut.dir, sha256: lcOut.hash };

  const lpdOut = await writeCsvBundle(
    root_dir,
    "EXP-SO1-LPD",
    "lpd_zonal.csv",
    lpd.csv,
    lpd.metadata
  );
  packages.EXP_SO1_LPD = { path: lpdOut.dir, sha256: lpdOut.hash };

  const socOut = await writeCsvBundle(
    root_dir,
    "EXP-SO1-SOC",
    "soc_tier2.csv",
    soc.csv.tier2,
    soc.metadata
  );
  packages.EXP_SO1_SOC = { path: socOut.dir, sha256: socOut.hash };

  const manifest = {
    bundle_id,
    package_id: "REPORTING-BUNDLE",
    reporting_period,
    generated_at,
    eligibility,
    rehearsal,
    packages,
    stats: {
      field: field.stats,
      status_degraded_pct: status.summary.degraded_area_percent,
      soc: soc.stats,
    },
    steering_blockers: [
      "Production bundle requires eligibility=locked",
      "LDN-NAT-ALL Area unit (Q1)",
      "1OAO pending national LC+LPD+SOC",
    ],
  };

  const manifest_path = path.join(root_dir, "bundle_manifest.json");
  await fs.writeFile(manifest_path, JSON.stringify(manifest, null, 2), "utf-8");

  return {
    bundle_id,
    reporting_period,
    root_dir,
    generated_at,
    eligibility,
    packages,
    manifest_path,
    rehearsal_note: rehearsal
      ? "Rehearsal bundle: field rows not locked-filtered."
      : "Official eligibility filter applied.",
  };
}