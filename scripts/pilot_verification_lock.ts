/**
 * Pilot: lock N LDN records through full verification chain (local ledger only).
 * Usage: npx tsx scripts/pilot_verification_lock.ts [--count=3] [--revert]
 */
import fs from "fs/promises";
import path from "path";
import ldnData from "../public/ldn-data.json";
import { patchLocalRecord } from "../lib/local-data-modifications";
import { appendVerificationLog } from "../lib/verification-log";
import { buildTransitionPatch } from "../lib/verification-transitions";
import type { VerificationStatus } from "../lib/compliance-metadata";
import reportingConfig from "../public/reporting-period-config.json";

const ACTOR_DISTRICT = "pilot.district@ema.zw";
const ACTOR_NATIONAL = "pilot.national@ema.zw";
const ACTOR_REPORTING = "pilot.reporting@ema.zw";

const CHAIN: {
  from: VerificationStatus;
  to: VerificationStatus;
  actor: string;
  comment?: string;
  reporting_period?: string;
}[] = [
  { from: "submitted", to: "district_review", actor: ACTOR_DISTRICT },
  {
    from: "district_review",
    to: "national_review",
    actor: ACTOR_DISTRICT,
    comment: "Pilot district QA complete",
  },
  {
    from: "national_review",
    to: "approved",
    actor: ACTOR_NATIONAL,
    comment: "Pilot national methodology OK",
  },
  {
    from: "approved",
    to: "locked",
    actor: ACTOR_REPORTING,
    comment: "Pilot lock for SO1 rehearsal",
    reporting_period:
      reportingConfig.periods?.find((p) => p.is_active)?.reporting_period ??
      "2020-2023",
  },
];

async function getCurrentStatus(recordId: string): Promise<VerificationStatus> {
  const modPath = path.join(process.cwd(), "public", "ldn-modifications.json");
  try {
    const mod = JSON.parse(await fs.readFile(modPath, "utf-8"));
    const s = mod.edits?.[recordId]?.verification_status;
    if (s) return s as VerificationStatus;
  } catch {
    /* no mod file */
  }
  return "submitted";
}

async function applyChain(recordId: string) {
  let status = await getCurrentStatus(recordId);
  for (const step of CHAIN) {
    if (status !== step.from) continue;
    const patch = buildTransitionPatch(step.from, step.to, {
      actor: step.actor,
      comment: step.comment,
      reporting_period: step.reporting_period,
    });
    await patchLocalRecord("ldn", recordId, patch);
    try {
      await appendVerificationLog({
        record_type: "ldn",
        record_id: recordId,
        from_status: step.from,
        to_status: step.to,
        actor_id: step.actor,
        note: step.comment ?? null,
        reporting_period: patch.reporting_period ?? null,
        metadata: { pilot: true },
      });
    } catch (e) {
      console.warn("Audit log append skipped:", e instanceof Error ? e.message : e);
    }
    status = step.to;
  }
  return status;
}

async function revertPilot() {
  const modPath = path.join(process.cwd(), "public", "ldn-modifications.json");
  const mod = JSON.parse(await fs.readFile(modPath, "utf-8"));
  const pilotEdits = Object.entries(mod.edits || {}).filter(([, v]) => {
    const row = v as Record<string, unknown>;
    return row.verification_status === "locked" && row.verified_by?.toString().includes("pilot");
  });
  for (const [id] of pilotEdits) {
    delete mod.edits[id];
  }
  await fs.writeFile(modPath, JSON.stringify(mod, null, 2), "utf-8");
  const logPath = path.join(process.cwd(), "public", "verification-log.json");
  const log = JSON.parse(await fs.readFile(logPath, "utf-8"));
  log.entries = (log.entries || []).filter(
    (e: { metadata?: { pilot?: boolean } }) => !e.metadata?.pilot
  );
  await fs.writeFile(logPath, JSON.stringify(log, null, 2), "utf-8");
  console.log("Reverted", pilotEdits.length, "pilot lock edits");
}

async function main() {
  if (process.argv.includes("--revert")) {
    await revertPilot();
    return;
  }

  const countArg = process.argv.find((a) => a.startsWith("--count="));
  const count = countArg ? parseInt(countArg.split("=")[1], 10) : 3;
  const records = (ldnData as { records: { kobo_id?: string; id?: string }[] }).records;
  const ids = records
    .slice(0, count)
    .map((r) => String(r.kobo_id ?? r.id))
    .filter(Boolean);

  console.log("Locking LDN records:", ids);
  for (const id of ids) {
    const final = await applyChain(id);
    console.log(id, "→", final);
  }

  const { buildExpSo1FieldPackage } = await import("../lib/exp-so1-field-export");
  const locked = await buildExpSo1FieldPackage({ eligibility: "locked" });
  console.log("\nLocked export count:", locked.stats.ldn_exported);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});