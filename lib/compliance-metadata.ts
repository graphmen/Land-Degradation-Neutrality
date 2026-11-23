/**
 * Phase 1 governance fields — backward compatible defaults on API responses.
 * See LDN Database Princeples/ANNEX_E_VERIFICATION_AND_REPORTING.md
 */

export const CODE_LIST_VERSION = "0.9-draft";
export const DEFAULT_BASELINE_PERIOD_ID = "t0_end_2015";

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

export type FieldGovernance = {
  verification_status: VerificationStatus;
  data_tier: DataTier;
  reporting_period: string | null;
  code_list_version: string;
  form_version_id: string | null;
  baseline_period_id: string;
  verified_by: string | null;
  verified_at: string | null;
};

export function newFieldSubmissionGovernance(
  overrides?: Partial<FieldGovernance>
): FieldGovernance {
  return {
    verification_status: "submitted",
    data_tier: "field_verify",
    reporting_period: null,
    code_list_version: overrides?.code_list_version ?? CODE_LIST_VERSION,
    form_version_id: overrides?.form_version_id ?? null,
    baseline_period_id: DEFAULT_BASELINE_PERIOD_ID,
    verified_by: null,
    verified_at: null,
    ...overrides,
  };
}

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
  if (out.baseline_period_id == null || out.baseline_period_id === "") {
    out.baseline_period_id = DEFAULT_BASELINE_PERIOD_ID;
  }
  if (out.form_version_id === undefined) {
    out.form_version_id = null;
  }
  if (out.verified_by === undefined) {
    out.verified_by = null;
  }
  if (out.verified_at === undefined) {
    out.verified_at = null;
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