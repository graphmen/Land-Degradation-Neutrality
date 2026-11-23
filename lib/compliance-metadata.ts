/**
 * Phase 1 governance fields — backward compatible defaults on API responses.
 * See LDN Database Princeples/ANNEX_E_VERIFICATION_AND_REPORTING.md
 */

export const CODE_LIST_VERSION = "0.9-draft";

export type VerificationStatus =
  | "draft"
  | "submitted"
  | "district_review"
  | "national_review"
  | "approved"
  | "locked"
  | "rejected"
  | "superseded";

export type DataTier =
  | "tier1_default"
  | "tier2_national"
  | "tier3_research"
  | "field_verify";

export function enrichComplianceFields(
  record: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...record };
  if (out.verification_status == null || out.verification_status === "") {
    out.verification_status = inferVerificationStatus(record);
  }
  if (out.data_tier == null || out.data_tier === "") {
    out.data_tier = "field_verify" as DataTier;
  }
  if (out.reporting_period == null) {
    out.reporting_period = null;
  }
  if (out.code_list_version == null) {
    out.code_list_version = CODE_LIST_VERSION;
  }
  return out;
}

function inferVerificationStatus(record: Record<string, unknown>): VerificationStatus {
  if (record._localStatus === "local") return "draft";
  return "submitted";
}

export function enrichRecords(records: unknown[]): unknown[] {
  return records.map((r) =>
  r && typeof r === "object" ? enrichComplianceFields(r as Record<string, unknown>) : r
  );
}