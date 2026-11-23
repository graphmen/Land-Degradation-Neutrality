import unitIndex from "@/public/national-unit-ld-index.json";

export type CeidJoinRule =
  | "second_segment"
  | "suffix_after_first_underscore"
  | "full_ceid";

export function parseCeidSegments(ceid: string): {
  parts: string[];
  second_segment: string | null;
  suffix_after_first: string | null;
} {
  const trimmed = ceid.trim();
  const parts = trimmed.split("_");
  return {
    parts,
    second_segment: parts.length >= 2 ? parts[1] : null,
    suffix_after_first: trimmed.includes("_")
      ? trimmed.split("_", 2)[1]
      : trimmed,
  };
}

export function resolveShapefileId(
  ceid: string,
  rule: CeidJoinRule = "second_segment"
): string | null {
  const { second_segment, suffix_after_first } = parseCeidSegments(ceid);
  if (rule === "full_ceid") return ceid;
  if (rule === "second_segment") return second_segment;
  return suffix_after_first;
}

type UnitRow = {
  ld_class: string;
  polygon_count: number;
  area_sum: number;
};

export function lookupNationalUnit(
  ceid: string,
  rule: CeidJoinRule = "second_segment"
): {
  ceid: string;
  rule: CeidJoinRule;
  shapefile_id: string | null;
  match: boolean;
  national_unit: UnitRow | null;
  steering_note: string;
} {
  const shapefile_id = resolveShapefileId(ceid, rule);
  const units = (unitIndex as { units?: Record<string, UnitRow> }).units ?? {};
  const national_unit = shapefile_id ? units[shapefile_id] ?? null : null;

  return {
    ceid,
    rule,
    shapefile_id,
    match: national_unit != null,
    national_unit,
    steering_note:
      "Interim rule until EMA Q2 sign-off. Non-numeric CEIDs (ZC*, names) may not match.",
  };
}