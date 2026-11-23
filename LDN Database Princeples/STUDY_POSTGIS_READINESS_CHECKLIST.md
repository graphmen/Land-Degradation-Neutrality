# Study — PostGIS load readiness (after S1–S4 + S2)

**Use when:** S2 Phase A+B applied · **Q1/Q2** signed · **not** before

---

## Gate chain

| Order | Gate | Migration / action |
|------:|------|-------------------|
| 1 | **S1** | Code lists in DB |
| 2 | **S2** A+B | `001` seed, `004`, `005` |
| 3 | **Q1** | `Area` unit documented |
| 4 | **Q2** | CEID rule + alias register |
| 5 | **S3–S4** | `002` LDN-NAT-ALL load |
| 6 | **S8** | `003` pressure (Lat/Long only) |

**Preflight:** `npm run s2:preflight` · `node scripts/verify_supabase_schema.mjs` (with env)

---

## Before `002` (polygons)

| ☐ | Check |
|---|--------|
| ☐ | `npm run qc:ceid` — match rate documented |
| ☐ | Approved rows in `reference-ceid-aliases.v0.1.json` if any |
| ☐ | [`LDN-NAT-ALL_IMPORT_PLAN.md`](./corpus/metadata/LDN-NAT-ALL_IMPORT_PLAN.md) §3 checklist |
| ☐ | Backup / staging schema agreed with DBA |

---

## Before `003` (pressure)

| ☐ | Check |
|---|--------|
| ☐ | **S8** signed — Lat/Long ingest only |
| ☐ | `npm run import:pressure-staging` current |
| ☐ | [`STEERING_S8_PRESSURE_ONE_PAGER.md`](./STEERING_S8_PRESSURE_ONE_PAGER.md) |

---

## Verify after apply

```powershell
npm run verify:supabase
npm run qc:refresh
```

*Parent:* [`R1_POST_MEETING_PLAYBOOK.md`](./R1_POST_MEETING_PLAYBOOK.md) · [`backend/SUPABASE_S2_STEERING_RUNBOOK.md`](../backend/SUPABASE_S2_STEERING_RUNBOOK.md)