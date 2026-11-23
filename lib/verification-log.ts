/**
 * Verification audit — local JSON ledger (always) + Supabase when table exists.
 */

import fs from "fs/promises";
import path from "path";
import { supabaseInsertLdn } from "./supabase-rest";

export type VerificationLogEntry = {
  id: string;
  record_type: string;
  record_id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string;
  actor_role?: string | null;
  reporting_period?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

const LOG_PATH = path.join(process.cwd(), "public", "verification-log.json");

async function loadLog(): Promise<{ entries: VerificationLogEntry[] }> {
  try {
    const raw = await fs.readFile(LOG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { entries: [] };
  }
}

async function saveLog(data: { entries: VerificationLogEntry[] }) {
  await fs.writeFile(LOG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function appendVerificationLog(
  entry: Omit<VerificationLogEntry, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
  }
): Promise<VerificationLogEntry> {
  const row: VerificationLogEntry = {
    id: entry.id ?? `vl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    created_at: entry.created_at ?? new Date().toISOString(),
    record_type: entry.record_type,
    record_id: entry.record_id,
    from_status: entry.from_status,
    to_status: entry.to_status,
    actor_id: entry.actor_id,
    actor_role: entry.actor_role ?? null,
    reporting_period: entry.reporting_period ?? null,
    note: entry.note ?? null,
    metadata: entry.metadata ?? {},
  };

  const log = await loadLog();
  log.entries.push(row);
  await saveLog(log);

  const dbRow = {
    record_type: row.record_type,
    record_id: row.record_id,
    from_status: row.from_status,
    to_status: row.to_status,
    actor_id: row.actor_id,
    actor_role: row.actor_role,
    reporting_period: row.reporting_period,
    note: row.note,
    metadata: row.metadata,
    created_at: row.created_at,
  };
  await supabaseInsertLdn("verification_log", dbRow);

  return row;
}

export async function listVerificationLog(filters?: {
  record_type?: string;
  record_id?: string;
  limit?: number;
}): Promise<VerificationLogEntry[]> {
  const log = await loadLog();
  let rows = log.entries;
  if (filters?.record_type) {
    rows = rows.filter((e) => e.record_type === filters.record_type);
  }
  if (filters?.record_id) {
    rows = rows.filter((e) => e.record_id === filters.record_id);
  }
  rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const limit = filters?.limit ?? 100;
  return rows.slice(0, limit);
}