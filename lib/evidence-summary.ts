/**
 * Evidence registry summary — counts only (R1 demo / R2 landing).
 */

import type { VerificationStatus } from "@/lib/compliance-metadata";
import {
  loadReconciledDrylandsRecords,
  loadReconciledLdnRecords,
  loadReconciledSoilRecords,
} from "@/lib/local-record-reconcile";

export type EvidenceSummaryPackage = {
  module_id: "evidence-summary";
  r2_preview: true;
  generated_at: string;
  by_type: { ldn: number; soil: number; drylands: number; total: number };
  by_verification_status: Record<string, number>;
  prais_eligible: number;
  locked_by_type: { ldn: number; soil: number; drylands: number };
};

function tally(
  records: Record<string, unknown>[]
): { byStatus: Record<string, number>; locked: number; prais: number } {
  const byStatus: Record<string, number> = {};
  let locked = 0;
  let prais = 0;
  for (const r of records) {
    const s = String(r.verification_status ?? "submitted") as VerificationStatus;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    if (s === "locked") {
      locked++;
      prais++;
    }
  }
  return { byStatus, locked, prais };
}

export async function buildEvidenceSummary(): Promise<EvidenceSummaryPackage> {
  const [ldn, soil, drylands] = await Promise.all([
    loadReconciledLdnRecords(),
    loadReconciledSoilRecords(),
    loadReconciledDrylandsRecords(),
  ]);

  const tLdn = tally(ldn);
  const tSoil = tally(soil);
  const tDry = tally(drylands);

  const by_verification_status: Record<string, number> = {};
  for (const t of [tLdn, tSoil, tDry]) {
    for (const [k, v] of Object.entries(t.byStatus)) {
      by_verification_status[k] = (by_verification_status[k] ?? 0) + v;
    }
  }

  return {
    module_id: "evidence-summary",
    r2_preview: true,
    generated_at: new Date().toISOString(),
    by_type: {
      ldn: ldn.length,
      soil: soil.length,
      drylands: drylands.length,
      total: ldn.length + soil.length + drylands.length,
    },
    by_verification_status,
    prais_eligible: tLdn.prais + tSoil.prais + tDry.prais,
    locked_by_type: {
      ldn: tLdn.locked,
      soil: tSoil.locked,
      drylands: tDry.locked,
    },
  };
}