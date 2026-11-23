import fs from "fs/promises";
import path from "path";

type ModFile = {
  additions: Record<string, unknown>[];
  deletions: string[];
  edits: Record<string, Record<string, unknown>>;
};

const paths = {
  ldn: {
    mod: path.join(process.cwd(), "public", "ldn-modifications.json"),
    data: path.join(process.cwd(), "public", "ldn-data.json"),
  },
  soil: {
    mod: path.join(process.cwd(), "public", "soil-modifications.json"),
    data: path.join(process.cwd(), "public", "soil-data.json"),
  },
  drylands: {
    mod: path.join(process.cwd(), "public", "drylands-modifications.json"),
    data: path.join(process.cwd(), "public", "drylands-data.json"),
  },
};

async function loadMod(modPath: string): Promise<ModFile> {
  try {
    const data = await fs.readFile(modPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { additions: [], deletions: [], edits: {} };
  }
}

async function saveMod(modPath: string, mod: ModFile) {
  await fs.writeFile(modPath, JSON.stringify(mod, null, 2), "utf-8");
}

async function syncDataFile(dataPath: string, mod: ModFile) {
  try {
    const rawData = await fs.readFile(dataPath, "utf-8");
    const json = JSON.parse(rawData);
    const records = json.records || [];

    const filtered = records.filter(
      (r: { _id?: unknown; id?: unknown }) => !mod.deletions.includes(String(r._id ?? r.id))
    );

    const edited = filtered.map((r: { _id?: unknown; id?: unknown }) => {
      const rid = String(r._id ?? r.id);
      if (mod.edits[rid]) return { ...r, ...mod.edits[rid] };
      return r;
    });

    const seen = new Set(edited.map((r: { _id?: unknown; id?: unknown }) => String(r._id ?? r.id)));
    for (const add of mod.additions) {
      const aid = String((add as { _id?: unknown })._id);
      if (!seen.has(aid)) {
        edited.push(add);
        seen.add(aid);
      }
    }

    json.records = edited;
    json.count = edited.length;
    await fs.writeFile(dataPath, JSON.stringify(json, null, 2), "utf-8");
  } catch (err) {
    console.warn(
      `Deferred sync of ${dataPath} (file may be locked — mod ledger is source of truth until next API read):`,
      err instanceof Error ? err.message : err
    );
  }
}

export async function appendLocalRecords(
  kind: keyof typeof paths,
  records: Record<string, unknown> | Record<string, unknown>[]
) {
  const list = Array.isArray(records) ? records : [records];
  const { mod: modPath, data: dataPath } = paths[kind];
  const mod = await loadMod(modPath);
  mod.additions.push(...list);
  await saveMod(modPath, mod);
  await syncDataFile(dataPath, mod);
}

/** Patch a record in the local modification ledger (Supabase sync is Phase 2). */
export async function patchLocalRecord(
  kind: keyof typeof paths,
  recordId: string,
  fields: Record<string, unknown>
) {
  const { mod: modPath, data: dataPath } = paths[kind];
  const mod = await loadMod(modPath);
  const id = String(recordId);

  const addedIndex = mod.additions.findIndex(
    (r: Record<string, unknown>) => String(r._id ?? r.id) === id
  );
  if (addedIndex !== -1) {
    mod.additions[addedIndex] = { ...mod.additions[addedIndex], ...fields };
  } else {
    mod.edits[id] = { ...(mod.edits[id] || {}), ...fields };
  }

  await saveMod(modPath, mod);
  await syncDataFile(dataPath, mod);
}