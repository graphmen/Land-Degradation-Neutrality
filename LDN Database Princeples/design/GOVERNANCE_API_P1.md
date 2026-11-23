# Governance API — Phase 1 (Annex E)

**Status:** Implemented in app layer · migration `004_field_governance.sql` **not yet applied** on Supabase.

## Read path (backward compatible)

`GET /api/ldn` · `/api/soil` · `/api/drylands` run [`enrichComplianceFields`](../../lib/compliance-metadata.ts) on every record:

| Field | Default when missing |
|-------|---------------------|
| `verification_status` | `submitted` (legacy Kobo); `draft` if `_localStatus === local` |
| `data_tier` | `field_verify` |
| `reporting_period` | `null` |
| `code_list_version` | `0.9-draft` |
| `baseline_period_id` | `t0_end_2015` |
| `form_version_id` / `verified_*` | `null` |

## Submit path

`POST /api/submit/ldn|soil|drylands` sets full governance via `newFieldSubmissionGovernance()` and returns a `governance` object in the JSON response.

## Reporting config

`GET /api/config/reporting` — mirrors `public/reporting-period-config.json` plus `active_reporting_period`.

## Verification transitions (local ledger only)

`POST /api/verify/transition`

```json
{
  "entity": "ldn",
  "record_id": "123456789",
  "from_status": "submitted",
  "to_status": "district_review",
  "actor": "district.gis@ema.zw"
}
```

Lock example (requires `reporting_period`):

```json
{
  "entity": "ldn",
  "record_id": "123456789",
  "from_status": "approved",
  "to_status": "locked",
  "actor": "reporting.officer@ema.zw",
  "reporting_period": "2020-2023"
}
```

Reject requires `comment`. Transitions enforced in [`lib/verification-transitions.ts`](../../lib/verification-transitions.ts).

**Phase 2:** [`GOVERNANCE_API_P2.md`](./GOVERNANCE_API_P2.md) — audit log + `GET /api/verify/log`. Verification workspace (R1) is Phase 3.

## Apply DB

Run `backend/migrations/004_field_governance.sql` in Supabase SQL editor after `001`.