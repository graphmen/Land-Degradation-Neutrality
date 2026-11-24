/**
 * Verification workspace queues — read model for R2 (Annex E states).
 */

import type { VerificationStatus } from "@/lib/compliance-metadata";
import {
  buildEvidenceRegistry,
  type EvidenceRegistryRow,
} from "@/lib/evidence-registry";
import {
  loadModularFieldSubmissions,
  loadReconciledDrylandsRecords,
  loadReconciledLdnRecords,
  loadReconciledSoilRecords,
} from "@/lib/local-record-reconcile";

export const QUEUE_DEFINITIONS: {
  queue: string;
  status: VerificationStatus;
  actor: string;
}[] = [
  { queue: "submitted", status: "submitted", actor: "District verifier" },
  { queue: "district", status: "district_review", actor: "National reporting officer" },
  { queue: "national", status: "national_review", actor: "Reporting officer" },
  { queue: "approved", status: "approved", actor: "Reporting officer" },
  { queue: "locked", status: "locked", actor: "Read-only / export" },
  { queue: "rejected", status: "rejected", actor: "District or national" },
];

export type VerificationQueuesPackage = {
  module_id: "verification-workspace";
  r2_preview: boolean;
  generated_at: string;
  evidence_total: number;
  totals_by_status: Record<string, number>;
  queues: Array<{
    queue: string;
    verification_status: VerificationStatus;
    actor: string;
    count: number;
  }>;
  records?: EvidenceRegistryRow[];
  filters: { queue?: string; limit?: number };
  note: string | null;
};

async function countByStatus(): Promise<{
  totals: Record<string, number>;
  total: number;
}> {
  const [ldn, soil, drylands, modular] = await Promise.all([
    loadReconciledLdnRecords(),
    loadReconciledSoilRecords(),
    loadReconciledDrylandsRecords(),
    loadModularFieldSubmissions(),
  ]);
  const totals: Record<string, number> = {};
  let total = 0;
  for (const list of [ldn, soil, drylands]) {
    for (const r of list) {
      total++;
      const s = String(r.verification_status ?? "submitted");
      totals[s] = (totals[s] ?? 0) + 1;
    }
  }
  for (const m of modular) {
    const modId = String(m.module_id ?? "");
    if (modId !== "pressures" && modId !== "so4_interventions") continue;
    total++;
    const gov = (m.governance ?? {}) as Record<string, unknown>;
    const s = String(gov.verification_status ?? "submitted");
    totals[s] = (totals[s] ?? 0) + 1;
  }
  return { totals, total };
}

export async function buildVerificationQueues(opts?: {
  queue?: string;
  limit?: number;
}): Promise<VerificationQueuesPackage> {
  const limit = Math.min(opts?.limit ?? 100, 2000);
  const { totals, total } = await countByStatus();

  const queues = QUEUE_DEFINITIONS.map((q) => ({
    queue: q.queue,
    verification_status: q.status,
    actor: q.actor,
    count: totals[q.status] ?? 0,
  }));

  let records: EvidenceRegistryRow[] | undefined;
  if (opts?.queue) {
    const def = QUEUE_DEFINITIONS.find((q) => q.queue === opts.queue);
    if (!def) {
      throw new Error(`Unknown queue: ${opts.queue}`);
    }
    const pkg = await buildEvidenceRegistry({
      verification_status: def.status,
      limit,
    });
    records = pkg.records;
  }

  const locked = totals.locked ?? 0;

  return {
    module_id: "verification-workspace",
    r2_preview: true,
    generated_at: new Date().toISOString(),
    evidence_total: total,
    totals_by_status: totals,
    queues,
    records,
    filters: {
      queue: opts?.queue,
      limit: opts?.queue ? limit : undefined,
    },
    note:
      locked > 0
        ? `${locked} locked record(s) — PRAIS-eligible when period assigned`
        : "No locked rows yet; pilot uses local mod ledger",
  };
}