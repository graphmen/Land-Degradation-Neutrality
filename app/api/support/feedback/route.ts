import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const FEEDBACK_PATH = path.join(process.cwd(), "public", "support-feedback.json");

export type FeedbackEntry = {
  id: string;
  created_at: string;
  category: string;
  module: string;
  officer_name: string;
  station: string;
  message: string;
  status: "open" | "reviewed";
};

async function readEntries(): Promise<FeedbackEntry[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_PATH, "utf-8");
    const parsed = JSON.parse(raw) as { entries?: FeedbackEntry[] };
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const entries = await readEntries();
  return NextResponse.json({ count: entries.length, entries });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const message = String(body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Feedback message is required." }, { status: 400 });
    }

    const entries = await readEntries();
    const entry: FeedbackEntry = {
      id: `FB-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
      category: String(body.category ?? "General Feedback"),
      module: String(body.module ?? "National Platform"),
      officer_name: String(body.officer_name ?? "EMA Officer").trim() || "EMA Officer",
      station: String(body.station ?? "Zimbabwe").trim() || "Zimbabwe",
      message,
      status: "open",
    };

    entries.unshift(entry);
    await fs.writeFile(
      FEEDBACK_PATH,
      JSON.stringify({ updated_at: new Date().toISOString(), entries }, null, 2),
      "utf-8"
    );

    return NextResponse.json({ success: true, entry });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save feedback" },
      { status: 500 }
    );
  }
}
