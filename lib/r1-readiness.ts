/**
 * R1 meeting readiness — artefact checks (no legacy dashboard).
 */

import fs from "fs/promises";
import path from "path";

export type R1ReadinessPackage = {
  module_id: "r1-readiness";
  checked_at: string;
  qc_summary_at: string | null;
  artefacts: Record<string, boolean>;
  headline: {
    field_ldn: number | null;
    field_total: number | null;
    ceid_match_rate: number | null;
    locked_ldn_pilot: number | null;
  };
  commands: string[];
  ready_for_facilitation: boolean;
  notes: string[];
};

async function exists(rel: string): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), rel));
    return true;
  } catch {
    return false;
  }
}

async function loadJson<T>(rel: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), rel), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function buildR1Readiness(): Promise<R1ReadinessPackage> {
  const qc = await loadJson<{
    generated_at?: string;
    field_ldn?: { ceid_match_rate?: number; records_with_ceid?: number };
    field_drylands?: { count?: number };
    reporting_gates?: { locked_field_rows?: number };
  }>("public/qc-programme-summary.json");

  const artefacts = {
    qc_programme_summary: await exists("public/qc-programme-summary.json"),
    reporting_desk_dry_run: await exists("public/reporting-desk-dry-run.json"),
    qc_ceid_join_report: await exists("public/qc-ceid-join-report.json"),
    s2_migration_preflight: await exists("public/s2-migration-preflight.json"),
    reference_ceid_aliases: await exists("public/reference-ceid-aliases.v0.1.json"),
    verification_lock_policy: await exists("public/verification-lock-policy.json"),
  };

  const notes: string[] = [];
  if (!artefacts.reporting_desk_dry_run) {
    notes.push("Run npm run reporting:dry-run");
  }
  if (!artefacts.qc_programme_summary) {
    notes.push("Run npm run qc:refresh");
  }

  const fieldLdn = qc?.field_ldn;
  const locked =
    qc?.reporting_gates?.locked_field_rows ??
    (await loadJson<{ gates?: { locked_field_rows?: number } }>(
      "public/reporting-desk-dry-run.json"
    ))?.gates?.locked_field_rows ??
    null;

  const dryRun = await loadJson<{
    section_F?: { F2_EXP_SO1_FIELD?: { stats?: { ldn_total?: number; soil_total?: number } } };
  }>("public/reporting-desk-dry-run.json");
  const soilTotal = dryRun?.section_F?.F2_EXP_SO1_FIELD?.stats?.soil_total ?? null;
  const ldnTotal =
    dryRun?.section_F?.F2_EXP_SO1_FIELD?.stats?.ldn_total ??
    fieldLdn?.records_with_ceid ??
    null;
  const dryTotal = qc?.field_drylands?.count ?? null;
  const total =
    ldnTotal != null && soilTotal != null && dryTotal != null
      ? ldnTotal + soilTotal + dryTotal
      : null;

  const ready =
    Object.values(artefacts).every(Boolean) && artefacts.qc_programme_summary;

  return {
    module_id: "r1-readiness",
    checked_at: new Date().toISOString(),
    qc_summary_at: qc?.generated_at ?? null,
    artefacts,
    headline: {
      field_ldn: ldnTotal,
      field_total: total,
      ceid_match_rate: fieldLdn?.ceid_match_rate ?? null,
      locked_ldn_pilot: locked,
    },
    commands: ["npm run r1:preflight", "npm run dev", "npm run r1:smoke"],
    ready_for_facilitation: ready,
    notes,
  };
}