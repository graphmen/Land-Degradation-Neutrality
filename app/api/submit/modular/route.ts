import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MODULAR_STORE_PATH = path.join(process.cwd(), "public", "modular-field-submissions.json");

type ModularStore = {
  updated_at: string;
  count: number;
  records: Record<string, unknown>[];
};

async function readStore(): Promise<ModularStore> {
  try {
    const raw = await fs.readFile(MODULAR_STORE_PATH, "utf-8");
    return JSON.parse(raw) as ModularStore;
  } catch {
    return { updated_at: new Date().toISOString(), count: 0, records: [] };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get("module_id");
  const store = await readStore();
  const records = moduleId
    ? store.records.filter((r) => r.module_id === moduleId)
    : store.records;
  return NextResponse.json({
    updated_at: store.updated_at,
    count: records.length,
    records,
  });
}

/**
 * Universal Mobile Field Submission Endpoint.
 * Accepts any module_id from the EMA Modular Mobile Suite (pressures, so4_interventions, future EMA modules)
 * with idempotent deduplication on submission_id.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const submissionId = String(body?.submission_id ?? "");
    const moduleId = String(body?.module_id ?? "");

    if (!submissionId || !moduleId) {
      return NextResponse.json(
        { success: false, error: "submission_id and module_id are required" },
        { status: 400 }
      );
    }

    const store = await readStore();
    const existingIdx = store.records.findIndex(
      (r) => String(r.submission_id) === submissionId
    );

    const record = {
      ...body,
      received_at: new Date().toISOString(),
      governance: {
        ...(typeof body.governance === "object" && body.governance ? body.governance : {}),
        verification_status: "submitted",
      },
    };

    if (existingIdx >= 0) {
      store.records[existingIdx] = record;
    } else {
      store.records.unshift(record);
    }

    store.count = store.records.length;
    store.updated_at = new Date().toISOString();

    await fs.writeFile(MODULAR_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      submission_id: submissionId,
      module_id: moduleId,
      deduplicated: existingIdx >= 0,
      total_modular_records: store.count,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
