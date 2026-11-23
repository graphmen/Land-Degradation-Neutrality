import { NextResponse } from "next/server";
import staging from "@/public/pressure-layers-staging.json";

export const dynamic = "force-dynamic";

type StagingFile = {
  count?: number;
  policy?: string;
  steering_gate?: string;
  imported_at?: string;
  by_theme?: Record<string, number>;
  records?: Record<string, unknown>[];
};

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme");
  const file = staging as StagingFile;
  let records = file.records ?? [];
  if (theme) {
    records = records.filter((r) => r.theme === theme);
  }
  return NextResponse.json({
    count: records.length,
    policy: file.policy,
    steering_gate: file.steering_gate,
    imported_at: file.imported_at,
    by_theme: file.by_theme,
    records,
  });
}