# Supabase S2 — steering runbook (apply + verify)

**Decision ID:** **S2** in [`STEERING_DECISIONS_QUEUE.md`](../LDN%20Database%20Princeples/STEERING_DECISIONS_QUEUE.md)  
**Owner:** EMA DBA / project lead with Supabase project access  
**Schema:** `ldn`

---

## Before you start

| Gate | Needed for |
|------|------------|
| **S1** | `001` seed reflects signed Annex F v1.0 |
| **S3–S4** | `002` + PostGIS load (do **not** run early) |
| **S8** | `003` pressure import policy |

**This runbook applies Phase A + B** in one sitting (~30 min). Phase C/D wait on steering.

---

## Phase A — Reference data (requires S1)

In Supabase **SQL editor**, run file contents in order (copy/paste from repo):

1. [`migrations/001_reference_code_lists.sql`](./migrations/001_reference_code_lists.sql)
2. [`migrations/001_reference_code_lists_seed.sql`](./migrations/001_reference_code_lists_seed.sql)  
   - After JSON changes: `node scripts/generate_code_list_seed_sql.js` then re-run seed.

**Pass check:**

```sql
SELECT list_key, version, status FROM ldn.reference_code_lists ORDER BY 1, 2;
```

---

## Phase B — Governance + audit (safe after S1)

3. [`migrations/004_field_governance.sql`](./migrations/004_field_governance.sql)  
4. [`migrations/005_verification_log.sql`](./migrations/005_verification_log.sql)

**Pass check:** run [`VERIFY_MIGRATIONS.sql`](./VERIFY_MIGRATIONS.sql) sections **001**, **004**, **005** (expect governance columns + `verification_log` exists).

---

## Phase C — Pressure layers (requires **S8**)

5. [`migrations/003_pressure_layers.sql`](./migrations/003_pressure_layers.sql)  
6. Import per [`LDN Database Princeples/corpus/metadata/PRESSURE_LAYERS_QC.md`](../LDN%20Database%20Princeples/corpus/metadata/PRESSURE_LAYERS_QC.md)

---

## Phase D — National units (requires **S3–S4**)

7. [`migrations/002_national_ldn_units.sql`](./migrations/002_national_ldn_units.sql)  
8. ogr2ogr load per [`LDN Database Princeples/IMPORT_NATIONAL_LDN_UNITS.md`](../LDN%20Database%20Princeples/IMPORT_NATIONAL_LDN_UNITS.md)

---

## Verify from your machine

```powershell
# Order reminder
node scripts/verify_supabase_schema.mjs --checklist-only

# Live probe (set env — do not commit keys)
$env:SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "..."
node scripts/verify_supabase_schema.mjs
```

Expect HTTP **200** on: `reference_code_lists`, `reporting_period_config`, `verification_log`, `ldn_validations` (governance columns), optionally `pressure_layers` / `national_ldn_units` after C/D.

**SQL parity:** full script [`VERIFY_MIGRATIONS.sql`](./VERIFY_MIGRATIONS.sql)

---

## After S2 Phase A+B

- Point mobile `API_BASE` to deployed Next app (see [`MOBILE_API_DEPLOY.md`](../LDN%20Database%20Princeples/MOBILE_API_DEPLOY.md))
- Migrate verification **pilot** actors from `pilot.*@ema.zw` to real Supabase auth (see [`pilot/VERIFICATION_LOCK_PILOT.md`](../LDN%20Database%20Princeples/pilot/VERIFICATION_LOCK_PILOT.md))
- Re-run `npm run reporting:dry-run` against API-backed reads when sync is live

---

## Rollback note

Migrations are additive. If a step fails mid-file, fix SQL and re-run **only** the failed file after correcting state — do not skip `VERIFY_MIGRATIONS.sql`.