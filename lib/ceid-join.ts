import unitIndex from "@/public/national-unit-ld-index.json";
import ceidAliases from "@/public/reference-ceid-aliases.v0.1.json";

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

type AliasEntry = {
  ceid: string;
  category?: string;
  shapefile_id?: string | null;
  resolution?: string;
};

type AliasRegister = {
  entries?: AliasEntry[];
};

function findAlias(ceid: string): AliasEntry | null {
  const entries = (ceidAliases as AliasRegister).entries ?? [];
  return entries.find((e) => e.ceid === ceid) ?? null;
}

export function lookupNationalUnit(
  ceid: string,
  rule: CeidJoinRule = "second_segment"
): {
  ceid: string;
  rule: CeidJoinRule;
  shapefile_id: string | null;
  match: boolean;
  national_unit: UnitRow | null;
  match_via: "join_rule" | "alias" | null;
  alias_status: "pending_ema" | "approved" | "retired" | null;
  alias_category: string | null;
  steering_note: string;
} {
  const units = (unitIndex as { units?: Record<string, UnitRow> }).units ?? {};
  let shapefile_id = resolveShapefileId(ceid, rule);
  let national_unit = shapefile_id ? units[shapefile_id] ?? null : null;
  let match_via: "join_rule" | "alias" | null = national_unit ? "join_rule" : null;
  let alias_status: "pending_ema" | "approved" | "retired" | null = null;
  let alias_category: string | null = null;

  const alias = findAlias(ceid);
  if (alias) {
    alias_category = alias.category ?? null;
    const res = alias.resolution ?? "pending_ema";
    if (res === "retired") {
      alias_status = "retired";
    } else if (res === "approved" && alias.shapefile_id) {
      alias_status = "approved";
      shapefile_id = String(alias.shapefile_id);
      national_unit = units[shapefile_id] ?? null;
      if (national_unit) {
        match_via = "alias";
      }
    } else {
      alias_status = "pending_ema";
    }
  }

  return {
    ceid,
    rule,
    shapefile_id,
    match: national_unit != null,
    national_unit,
    match_via,
    alias_status,
    alias_category,
    steering_note:
      "Interim rule until EMA Q2 sign-off. Legacy tokens use reference-ceid-aliases.v0.1.json.",
  };
}