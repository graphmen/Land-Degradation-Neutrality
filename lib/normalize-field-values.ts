/** Annex F — normalize legacy labels on API read (Phase 1). */

const DRYLANDS_SEVERITY_CANONICAL: Record<string, { code: string; label: string }> = {
  none: { code: "none", label: "None" },
  low: { code: "low", label: "Low" },
  mild: { code: "low", label: "Low" },
  moderate: { code: "moderate", label: "Moderate" },
  severe: { code: "severe", label: "Severe" },
};

function drylandsSeverityFromValue(raw: unknown): { code: string; label: string } | null {
  if (raw == null || raw === "") return null;
  const key = String(raw).trim().toLowerCase();
  return (
    DRYLANDS_SEVERITY_CANONICAL[key] ?? {
      code: key,
      label: String(raw).trim(),
    }
  );
}

export function normalizeDrylandsFields(record: Record<string, unknown>): Record<string, unknown> {
  const out = { ...record };
  const sev = out.erosion_severity ?? out.erosion_severity_canonical;
  const canon = drylandsSeverityFromValue(sev);
  if (canon) {
    out.erosion_severity_code = canon.code;
    out.erosion_severity = canon.label;
    if (sev != null && String(sev).trim().toLowerCase() === "mild") {
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