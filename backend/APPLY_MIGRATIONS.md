# Apply Supabase migrations (Steps 1.3 and 2.1)

Run in the **Supabase SQL editor** in order (**steering runbook:** [`SUPABASE_S2_STEERING_RUNBOOK.md`](./SUPABASE_S2_STEERING_RUNBOOK.md)):

| Phase | When | Files |
|-------|------|--------|
| **A** | After **S1** | `001_reference_code_lists.sql` → `001_reference_code_lists_seed.sql` |
| **B** | Same session as A | `004_field_governance.sql` → `005_verification_log.sql` |
| **C** | After **S8** | `003_pressure_layers.sql` |
| **D** | After **S3–S4** | `002_national_ldn_units.sql` + ogr2ogr |

Regenerate seed after JSON changes: `node scripts/generate_code_list_seed_sql.js`

Verify:

```sql
SELECT list_key, version, status FROM ldn.reference_code_lists;
```

Full post-apply script: [`VERIFY_MIGRATIONS.sql`](./VERIFY_MIGRATIONS.sql)

CLI probe (after apply):

```powershell
node scripts/verify_supabase_schema.mjs
# Order reminder only:
node scripts/verify_supabase_schema.mjs --checklist-only
```

PostGIS load for `national_ldn_units` is documented in `LDN Database Princeples/IMPORT_NATIONAL_LDN_UNITS.md`.

**Steering gate:** do not apply `003` / shapefile load until **S8** and **S3–S4** in [`STEERING_DECISIONS_QUEUE.md`](../LDN Database Princeples/STEERING_DECISIONS_QUEUE.md).