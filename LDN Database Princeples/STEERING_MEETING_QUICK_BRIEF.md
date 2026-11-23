# Steering meeting — 30-minute quick brief

**Attach:** [`R1_STEERING_SIGN_OFF_PACK.md`](./R1_STEERING_SIGN_OFF_PACK.md) · [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md)

## What we built (since reframe)

- National **corpus** QC (LDN 254k, pressure, SBC, projects)
- **Governance API** + verification audit log
- **Export rehearsal** §F (bundle with manifest hashes)
- **Mobile** Android UAT + CEID national LD hint
- **Validator API** (`/api/validator/ceid`)
- **Verification pilot** — 3 LDN rows `locked` (local mod ledger; `npm run pilot:lock`)

## What we are not shipping yet

- New government web shell (**R2** — needs **R1** sign-off)
- PostGIS production load (needs **S2** + Q1/Q2)

## Ask in the room

| # | Decision |
|---|----------|
| S1 | Code lists v1.0 |
| S2 | Apply DB migrations (**Phase A+B** runbook) |
| S3–S4 | Area unit + CEID join |
| S5 | Reporting period |
| S6 | R1 module map sign-off |

## Live demo (optional, 5 min)

1. `GET /api/validator/ceid?ceid=11268_17236`  
2. `GET /api/export/meta`  
3. Mobile CEID blur (APK on tablet)  
4. `GET /api/status` → `locked_ldn_exports: 3` (pilot)

## DBA pack (S2)

[`backend/SUPABASE_S2_STEERING_RUNBOOK.md`](../backend/SUPABASE_S2_STEERING_RUNBOOK.md) · `VERIFY_MIGRATIONS.sql` · `node scripts/verify_supabase_schema.mjs --checklist-only`