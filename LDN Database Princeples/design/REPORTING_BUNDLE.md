# Reporting bundle — §F rehearsal export

**CLI:** `npx tsx scripts/export_reporting_bundle.ts`  
**API:** `GET /api/export/bundle` (rehearsal) · `?official=1` for `eligibility=locked`

Writes under `exports/{reporting_period}/`:

- `BUNDLE-{timestamp}/bundle_manifest.json` (SHA-256 per package)
- `BUNDLE-*/EXP-SO1-{LC,LPD,SOC}/`
- Sibling folders `EXP-META`, `EXP-SO1-FIELD`, `EXP-SO1-STATUS` with timestamps

Production: require locked field rows before `official=1`.