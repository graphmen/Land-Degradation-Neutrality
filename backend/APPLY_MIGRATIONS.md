# Apply Supabase migrations (Steps 1.3 and 2.1)

Run in the **Supabase SQL editor** (project linked to this repo) in order:

1. `backend/migrations/001_reference_code_lists.sql`
2. `backend/migrations/001_reference_code_lists_seed.sql` (regenerate with `node scripts/generate_code_list_seed_sql.js` after JSON changes)
3. `backend/migrations/002_national_ldn_units.sql`
4. `backend/migrations/004_field_governance.sql` (reporting periods + field table columns)
5. `backend/migrations/005_verification_log.sql` (audit trail)
6. `backend/migrations/003_pressure_layers.sql` (after EMA access policy sign-off)

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