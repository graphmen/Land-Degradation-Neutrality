# Governance API — Phase 2 (verification audit)

**Migration:** `005_verification_log.sql` (apply after `004`; replaces stub if `003` was never applied)

## Audit on transition

`POST /api/verify/transition` now:

1. Patches local modification ledger (unchanged)  
2. Appends to `public/verification-log.json`  
3. **Best-effort** insert into `ldn.verification_log` (ignored client-side if table missing)

Response includes `audit: { id, created_at }`.

## Read audit

`GET /api/verify/log?entity=ldn&record_id=123&limit=50`

## Log row shape

| Field | Purpose |
|-------|---------|
| `record_type` | `ldn` \| `soil` \| `drylands` |
| `from_status` / `to_status` | Annex E §E.2 |
| `actor_id` / `actor_role` | Reviewer identity |
| `reporting_period` | Set on `locked` |
| `note` | Free text / rejection reason |
| `metadata` | `district_note`, `national_note`, etc. |

**Rule:** Log is append-only; corrections are new rows, not edits.

## Phase 3

Verification workspace (R1) consumes the same API; mobile stays read-only on status.