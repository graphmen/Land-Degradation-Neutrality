# Steering decisions queue (living)

**Updated:** 2026-11-23 · **Use with:** [`EMA_STEERING_ONE_PAGER.md`](./EMA_STEERING_ONE_PAGER.md)

| ID | Decision | Evidence | Blocks |
|----|----------|----------|--------|
| **S1** | Code list v1.0 sign-off (Annex F) | `reference-code-lists.v0.9.json` | Mobile labels, exports |
| **S2** | Apply Supabase `001`–`005`, then `003` | [`APPLY_MIGRATIONS.md`](../backend/APPLY_MIGRATIONS.md) · [`VERIFY_MIGRATIONS.sql`](../backend/VERIFY_MIGRATIONS.sql) · `node scripts/verify_supabase_schema.mjs` | DB governance, pressure load |
| **S3** | LDN-NAT-ALL **Area** unit (Q1) | [`CEID_JOIN_QC.md`](./corpus/metadata/CEID_JOIN_QC.md) | PostGIS load, SO1-STATUS km² |
| **S4** | CEID ↔ shapefile `Id` rule (Q2) | 93/147 `second_segment` | Validator join |
| **S5** | Reporting period `2020-2023` active | `reporting-period-config.json` | Lock snapshots |
| **S6** | **R1** information architecture sign-off | [`R1_INFORMATION_ARCHITECTURE.md`](./R1_INFORMATION_ARCHITECTURE.md) | Government web shell |
| **S7** | Peer twins (Botswana + Panama?) | [`STEERING_PEER_TWINNING_RECOMMENDATION.md`](./STEERING_PEER_TWINNING_RECOMMENDATION.md) | Study narrative |
| **S8** | Pressure load = Lat/Long only | [`PRESSURE_LAYERS_QC.md`](./corpus/metadata/PRESSURE_LAYERS_QC.md) | `003` import |
| **S9** | Projects geog 47 vs UTM 65 | [`INTERVENTION_SPATIAL_QC.md`](./corpus/metadata/INTERVENTION_SPATIAL_QC.md) | INT-PROJECTS load |

## Ready for meeting

- Export rehearsal: `npx tsx scripts/export_reporting_bundle.ts`
- Dry-run JSON: `public/reporting-desk-dry-run.json`
- Block reviews: `BLOCK_REVIEW_2026-11-23_*.md`