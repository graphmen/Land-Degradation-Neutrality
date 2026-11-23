# Apply Supabase migrations (Steps 1.3 and 2.1)

Run in the **Supabase SQL editor** (project linked to this repo) in order:

1. `backend/migrations/001_reference_code_lists.sql`
2. `backend/migrations/001_reference_code_lists_seed.sql` (regenerate with `node scripts/generate_code_list_seed_sql.js` after JSON changes)
3. `backend/migrations/002_national_ldn_units.sql`

Verify:

```sql
SELECT list_key, version, status FROM ldn.reference_code_lists;
```

PostGIS load for `national_ldn_units` is documented in `LDN Database Princeples/IMPORT_NATIONAL_LDN_UNITS.md`.