/**
 * R2 National overview payload — API-only until government shell ships.
 * See R1_INFORMATION_ARCHITECTURE.md §4
 */

import fs from "fs/promises";
import path from "path";
import reportingConfig from "@/public/reporting-period-config.json";
import { buildCorpusManifest } from "@/lib/corpus-manifest";
import { buildExpSo1StatusPackage } from "@/lib/exp-so1-status-export";
import {
  loadReconciledDrylandsRecords,
  loadReconciledLdnRecords,
  loadReconciledSoilRecords,
} from "@/lib/local-record-reconcile";

export type NationalOverviewPackage = {
  module_id: "national-overview";
  r2_preview: true;
  generated_at: string;
  reporting_period: string | null;
  reporting_deadline: string | null;
  so1: {
    degraded_area_percent: number | null;
    one_ao_ready: boolean;
    note: string;
  };
  field_evidence: {
    ldn: number;
    soil: number;
    drylands: number;
    total: number;
    ceid_match_rate: number | null;
    ceid_alias_pending: number | null;
  };
  verification: {
    backlog_submitted: number;
    locked_count: number;
    pilot_note: string | null;
  };
  corpus_health: {
    layer_count: number;
    by_import_status: Record<string, number>;
    staging_highlights: Record<string, number | null>;
  };
  reporting_desk: {
    f1_meta_pass: boolean | null;
    locked_field_rows: number | null;
    steering_blockers: string[];
  };
  steering_actions: Array<{ label: string; href: string }>;
  qc_summary_path: string;
  feature_flag: { env: string; enabled: boolean };
};

async function loadJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "public", file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function countVerification(
  records: Record<string, unknown>[]
): { backlog: number; locked: number } {
  let backlog = 0;
  let locked = 0;
  for (const r of records) {
    const s = String(r.verification_status ?? "submitted");
    if (s === "locked") locked++;
    else if (s !== "draft" && s !== "superseded") backlog++;
  }
  return { backlog, locked };
}

export async function buildNationalOverview(): Promise<NationalOverviewPackage> {
  const period =
    reportingConfig.periods?.find((p) => p.is_active)?.reporting_period ?? null;
  const praisDue =
    reportingConfig.periods?.find((p) => p.is_active)?.prais_due ?? null;

  const statusPkg = await buildExpSo1StatusPackage({ reporting_period: period });
  const layers = buildCorpusManifest();
  const byStatus: Record<string, number> = {};
  for (const row of layers) {
    byStatus[row.import_status] = (byStatus[row.import_status] ?? 0) + 1;
  }

  const [ldn, soil, drylands] = await Promise.all([
    loadReconciledLdnRecords(),
    loadReconciledSoilRecords(),
    loadReconciledDrylandsRecords(),
  ]);
  const vLdn = countVerification(ldn);
  const vSoil = countVerification(soil);
  const vDry = countVerification(drylands);
  const backlog = vLdn.backlog + vSoil.backlog + vDry.backlog;
  const locked = vLdn.locked + vSoil.locked + vDry.locked;

  const dryRun = await loadJson<{
    gates?: {
      locked_field_rows?: number;
      steering_blockers?: string[];
    };
    section_F?: { F1_EXP_META?: { pass?: boolean } };
  }>("reporting-desk-dry-run.json");

  const qc = await loadJson<{
    pressure_staging_count?: number;
    staging_counts?: { ema_projects?: number; sbc?: number };
    field_ldn?: { ceid_match_rate?: number; ceid_alias_pending?: number };
  }>("qc-programme-summary.json");

  const flag = process.env.ENABLE_NATIONAL_OVERVIEW_API !== "false";

  return {
    module_id: "national-overview",
    r2_preview: true,
    generated_at: new Date().toISOString(),
    reporting_period: period,
    reporting_deadline: praisDue ? `November ${praisDue.split("-")[0] ?? "2026"}` : null,
    so1: {
      degraded_area_percent: statusPkg.summary.degraded_area_percent,
      one_ao_ready: statusPkg.metadata.one_ao_ready === true,
      note: statusPkg.metadata.one_ao_ready
        ? "Placeholder until national LC+LPD+SOC"
        : "LD polygon zonal % — not full 1OAO",
    },
    field_evidence: {
      ldn: ldn.length,
      soil: soil.length,
      drylands: drylands.length,
      total: ldn.length + soil.length + drylands.length,
      ceid_match_rate: qc?.field_ldn?.ceid_match_rate ?? null,
      ceid_alias_pending: qc?.field_ldn?.ceid_alias_pending ?? null,
    },
    verification: {
      backlog_submitted: backlog,
      locked_count: locked,
      pilot_note: locked > 0 && locked < 10 ? `${locked} pilot lock(s)` : null,
    },
    corpus_health: {
      layer_count: layers.length,
      by_import_status: byStatus,
      staging_highlights: {
        pressure_points: qc?.pressure_staging_count ?? null,
        ema_projects: qc?.staging_counts?.ema_projects ?? null,
        sbc_points: qc?.staging_counts?.sbc ?? null,
      },
    },
    reporting_desk: {
      f1_meta_pass: dryRun?.section_F?.F1_EXP_META?.pass ?? null,
      locked_field_rows: dryRun?.gates?.locked_field_rows ?? null,
      steering_blockers: dryRun?.gates?.steering_blockers ?? [],
    },
    steering_actions: [
      { label: "Reporting desk §F gates", href: "/api/config/reporting-dry-run" },
      { label: "Export bundle rehearsal", href: "/api/export/bundle" },
      { label: "Evidence summary", href: "/api/evidence/summary" },
      { label: "Evidence registry", href: "/api/evidence/registry" },
      { label: "Corpus layers", href: "/api/corpus-layers" },
      { label: "QC summary", href: "/api/qc/summary" },
      { label: "Verification queues", href: "/api/verify/queues" },
      { label: "Verification audit log", href: "/api/verify/log" },
    ],
    qc_summary_path: "public/qc-programme-summary.json",
    feature_flag: {
      env: "ENABLE_NATIONAL_OVERVIEW_API",
      enabled: flag,
    },
  };
}