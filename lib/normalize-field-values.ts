/** Annex F — normalize legacy labels on API read (Phase 1). */

export function normalizeDrylandsFields(record: Record<string, unknown>): Record<string, unknown> {
  const out = { ...record };
  const sev = out.erosion_severity ?? out.erosion_severity_canonical;
  if (sev != null) {
    const s = String(sev).trim().toLowerCase();
    if (s === "mild") {
      out.erosion_severity = "Low";
      out._erosion_severity_legacy = sev;
    }
  }
  if (typeof out.vegetation_condition === "string") {
    out.vegetation_condition = String(out.vegetation_condition).trim();
  }
  if (typeof out.priority_level === "string") {
    out.priority_level = String(out.priority_level).trim();
  }
  return out;
}

export function normalizeDrylandsRecords(records: unknown[]): unknown[] {
  return records.map((r) =>
    r && typeof r === "object"
      ? normalizeDrylandsFields(r as Record<string, unknown>)
      : r
  );
}