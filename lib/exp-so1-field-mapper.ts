/**
 * Annex E §E.5 — EXP-SO1-FIELD row mappers.
 */

import codeLists from "@/public/reference-code-lists.v0.9.json";
import { CODE_LIST_VERSION } from "@/lib/compliance-metadata";

type Lcn = { code: string; label: string; unccd_class?: string; legacy_codes?: string[] };
type Sev = { code: string; label: string; legacy_codes?: string[] };

const LC_LIST: Lcn[] = codeLists.lists?.ldn_land_cover_national?.values ?? [];
const SEV_LIST: Sev[] = codeLists.lists?.ldn_severity?.values ?? [];

function pickStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function resolveLandCoverNational(label: string | null): {
  land_cover_national: string | null;
  unccd_land_cover_class: string | null;
} {
  if (!label) return { land_cover_national: null, unccd_land_cover_class: null };
  const norm = label.toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
  for (const row of LC_LIST) {
    if (row.code === norm || row.label.toLowerCase() === label.toLowerCase()) {
      return {
        land_cover_national: row.code,
        unccd_land_cover_class: row.unccd_class ?? null,
      };
    }
  }
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return { land_cover_national: slug || null, unccd_land_cover_class: null };
}

function resolveSeverity(raw: string | null): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase();
  for (const row of SEV_LIST) {
    if (row.code === key) return row.code;
    const legacy = row.legacy_codes ?? [];
    if (legacy.some((c) => c.toLowerCase() === key)) return row.code;
    if (row.label.toLowerCase() === key) return row.code;
  }
  return raw;
}

function parseMeasurementDate(record: Record<string, unknown>): string | null {
  const raw = record.raw_data as Record<string, unknown> | undefined;
  const ts = pickStr(
    record.measurement_date,
    record.submission_time,
    raw?._submission_time,
    raw?.measurement_date
  );
  if (!ts) return null;
  return ts.length >= 10 ? ts.slice(0, 10) : ts;
}

export const EXP_SO1_LDN_COLUMNS = [
  "uuid",
  "submission_id",
  "collect_earth_id",
  "reporting_period",
  "verification_status",
  "data_tier",
  "lat",
  "lng",
  "accuracy_m",
  "district",
  "ward",
  "measurement_date",
  "unccd_land_cover_class",
  "land_cover_national",
  "land_use_type",
  "degradation_severity",
  "degradation_signs",
  "vegetation_cover",
  "matches_baseline_lc",
  "verified_by",
  "verified_at",
  "form_version_id",
  "code_list_version",
] as const;

export const EXP_SO1_SOIL_COLUMNS = [
  "uuid",
  "submission_id",
  "parent_uuid",
  "collect_earth_id",
  "reporting_period",
  "verification_status",
  "data_tier",
  "lat",
  "lng",
  "depth_cm",
  "texture_class",
  "moisture_condition",
  "soc_percent",
  "lab_number",
  "sample_position",
  "verified_at",
] as const;

export function mapLdnToExpSo1Field(record: Record<string, unknown>) {
  const raw = (record.raw_data as Record<string, unknown>) || {};
  const landCoverLabel = pickStr(record.land_cover, raw.landcov, raw["poidet/landcov"]);
  const lc = resolveLandCoverNational(landCoverLabel);
  const landUse = pickStr(record.land_use, raw.landus, raw["poidet/landus"]);
  const submissionId = pickStr(record.kobo_id, record.id, raw._id, record._id);

  return {
    uuid: pickStr(record.uuid, raw._uuid),
    submission_id: submissionId,
    collect_earth_id: pickStr(record.ceid, raw.ceid, raw["geninfo/ceid"]),
    reporting_period: (record.reporting_period as string | null) ?? null,
    verification_status: pickStr(record.verification_status) ?? "submitted",
    data_tier: pickStr(record.data_tier) ?? "field_verify",
    lat: record.lat ?? null,
    lng: record.lng ?? null,
    accuracy_m: record.accuracy ?? raw.accuracy ?? null,
    district: pickStr(record.district, raw.dist, raw["geninfo/dist"]),
    ward: pickStr(record.ward, raw.ward, raw["geninfo/ward"]),
    measurement_date: parseMeasurementDate(record),
    unccd_land_cover_class: lc.unccd_land_cover_class,
    land_cover_national: lc.land_cover_national,
    land_use_type: landUse,
    degradation_severity: resolveSeverity(
      pickStr(record.severity, raw.sev, raw["ldi/sev"])
    ),
    degradation_signs: pickStr(record.erosion_signs, raw.signs_ero, raw["ldi/signs_ero"]),
    vegetation_cover: pickStr(record.veg_cover, raw.veg_cov, raw["ldi/veg_cov"]),
    matches_baseline_lc: pickStr(record.matches_baseline, raw.lndmat, raw["poidet/lndmat"]),
    verified_by: (record.verified_by as string | null) ?? null,
    verified_at: (record.verified_at as string | null) ?? null,
    form_version_id: (record.form_version_id as string | null) ?? null,
    code_list_version: pickStr(record.code_list_version) ?? CODE_LIST_VERSION,
  };
}

export function mapSoilToExpSo1Field(record: Record<string, unknown>) {
  const raw = (record.raw_data as Record<string, unknown>) || {};
  const submissionId = pickStr(record.kobo_id, record.id, raw._id, record._id);

  return {
    uuid: pickStr(record.uuid, raw._uuid),
    submission_id: submissionId,
    parent_uuid: pickStr(record.parent_uuid, record.parent_kobo_id),
    collect_earth_id: pickStr(record.ceid, raw.ceid, raw["geninfo/ceid"]),
    reporting_period: (record.reporting_period as string | null) ?? null,
    verification_status: pickStr(record.verification_status) ?? "submitted",
    data_tier: pickStr(record.data_tier) ?? "field_verify",
    lat: record.lat ?? null,
    lng: record.lng ?? null,
    depth_cm: record.depth_cm ?? raw.dep ?? null,
    texture_class: pickStr(record.texture, raw.tex, raw["sampl/tex"]),
    moisture_condition: pickStr(record.moisture, raw.moisture, raw["sampl/moisture"]),
    soc_percent: record.soc_percent ?? raw.soc_percent ?? null,
    lab_number: pickStr(record.lab_number, raw.lab_number),
    sample_position: pickStr(record.sample_position, raw.samloc, raw["sampl/samloc"]),
    verified_at: (record.verified_at as string | null) ?? null,
  };
}