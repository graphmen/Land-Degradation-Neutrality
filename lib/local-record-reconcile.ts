import fs from "fs/promises";
import path from "path";
import ldnDataStatic from "@/public/ldn-data.json";
import soilDataStatic from "@/public/soil-data.json";
import drylandsDataStatic from "@/public/drylands-data.json";
import { enrichRecords } from "@/lib/compliance-metadata";

type ModFile = {
  additions: Record<string, unknown>[];
  deletions: string[];
  edits: Record<string, Record<string, unknown>>;
};

async function loadMod(modPath: string): Promise<ModFile> {
  try {
    const data = await fs.readFile(modPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { additions: [], deletions: [], edits: {} };
  }
}

function reconcile<T extends { _id?: unknown; id?: unknown; kobo_id?: unknown }>(
  records: T[],
  mod: ModFile
): T[] {
  const deletionsSet = new Set(mod.deletions.map((id) => String(id)));
  let out = records.filter((r) => {
    const rid = String(r._id ?? r.id ?? r.kobo_id);
    return !deletionsSet.has(rid);
  });
  out = out.map((r) => {
    const rid = String(r._id ?? r.id ?? r.kobo_id);
    if (mod.edits[rid]) {
      return { ...r, ...mod.edits[rid] } as T;
    }
    return r;
  });
  const seen = new Set(out.map((r) => String(r._id ?? r.id ?? r.kobo_id)));
  for (const add of mod.additions) {
    const aid = String((add as { _id?: unknown })._id ?? (add as { id?: unknown }).id);
    if (!seen.has(aid)) {
      out.push(add as T);
      seen.add(aid);
    }
  }
  return out;
}

export async function loadReconciledLdnRecords(): Promise<Record<string, unknown>[]> {
  const modPath = path.join(process.cwd(), "public", "ldn-modifications.json");
  const mod = await loadMod(modPath);
  const base = (ldnDataStatic as { records?: Record<string, unknown>[] }).records ?? [];
  const reconciled = reconcile(base, mod);
  return enrichRecords(reconciled) as Record<string, unknown>[];
}

export async function loadReconciledSoilRecords(): Promise<Record<string, unknown>[]> {
  const modPath = path.join(process.cwd(), "public", "soil-modifications.json");
  const mod = await loadMod(modPath);
  const base = (soilDataStatic as { records?: Record<string, unknown>[] }).records ?? [];
  const reconciled = reconcile(base, mod);
  return enrichRecords(reconciled) as Record<string, unknown>[];
}

export async function loadReconciledDrylandsRecords(): Promise<Record<string, unknown>[]> {
  const modPath = path.join(process.cwd(), "public", "drylands-modifications.json");
  const mod = await loadMod(modPath);
  const base =
    (drylandsDataStatic as { records?: Record<string, unknown>[] }).records ?? [];
  const reconciled = reconcile(base, mod);
  return enrichRecords(reconciled) as Record<string, unknown>[];
}