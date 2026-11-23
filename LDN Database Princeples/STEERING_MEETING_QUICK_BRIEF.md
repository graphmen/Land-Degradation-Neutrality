# Steering meeting — 30-minute quick brief

**Attach:** [`R1_STEERING_SIGN_OFF_PACK.md`](./R1_STEERING_SIGN_OFF_PACK.md) · [`STEERING_S1_S2_DECISION_PACK.md`](./STEERING_S1_S2_DECISION_PACK.md) · [`STEERING_GIS_SO1_DECISION_PACK.md`](./STEERING_GIS_SO1_DECISION_PACK.md) · [`STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.md`](./STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.md) · [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md)

## What we built (since reframe)

- National **corpus** QC — `npm run qc:refresh` (CEID, rasters, §F dry-run)
- **Field evidence 798** on `GET /api/national-overview` (LDN/soil/drylands)
- **CEID Q2 pack** — study, alias register, workshop CSV (`export:ceid-worksheet`)
- **Governance API** + verification audit log · **3** locked LDN pilot
- **Config APIs** — s2-preflight, reporting-dry-run, ceid-aliases
- **Steering Word** — 16 DOCX files (`export:steering-docx`)

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
| S7 | Peer twins (Botswana + Panama?) |
| S10 | LC raster source (F3) |
| S11 | LPD national source (F4) |
| S12 | SOC Tier-1 surface (F5) |

## Live demo (optional, 5 min)

1. `GET /api/validator/ceid?ceid=11268_17236`  
2. `GET /api/export/meta`  
3. Mobile CEID blur (APK on tablet)  
4. `GET /api/status` → `locked_ldn_exports: 3` (pilot)  
5. `GET /api/national-overview` → R2 landing JSON (rehearsal)  
6. `GET /api/evidence/registry?prais_eligible=true` → locked pilot rows  
7. `GET /api/verify/queues?queue=locked` → verification workspace preview  
8. `GET /api/config/s2-preflight` → S2 Phase A+B file hashes (DBA minutes)  
9. `GET /api/config/reporting-dry-run` → §F pass/fail for reporting officer

## Word pack (optional)

`npm run export:steering-docx` → `exports/steering-docx/` ([`STEERING_DOCX_EXPORT.md`](./STEERING_DOCX_EXPORT.md))

## DBA pack (S2)

[`backend/SUPABASE_S2_STEERING_RUNBOOK.md`](../backend/SUPABASE_S2_STEERING_RUNBOOK.md) · `VERIFY_MIGRATIONS.sql` · `node scripts/verify_supabase_schema.mjs --checklist-only`