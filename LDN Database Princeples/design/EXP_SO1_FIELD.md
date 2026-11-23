# Export job — `EXP-SO1-FIELD` (stub v0.1)

**Annex E §E.5** · Phase 4.1

## API

`GET /api/export/so1-field`

| Query | Default | Purpose |
|-------|---------|---------|
| `eligibility` | `rehearsal` | `locked` (production), `approved`, `rehearsal`, `all` |
| `reporting_period` | active config | Filter locks to period |
| `format` | `json` | `csv_ldn`, `csv_soil` downloads |
| `write=1` | off | Write under `exports/{period}/EXP-SO1-FIELD/` (gitignored) |

## Outputs

- `ldn_field.csv` — Annex E LDN column list  
- `soil_field.csv` — Annex E soil column list  
- `metadata.json` — custodian, period, methods, counts  

## Mapping

- Land cover label → national code + UNCCD class (`reference-code-lists.v0.9.json`)  
- Severity legacy (`sli`, etc.) → national codes  
- Governance fields from [`compliance-metadata`](../../lib/compliance-metadata.ts) + local modifications ledger  

## Dry-run (today)

Legacy Kobo cache has **0 locked** rows — use `eligibility=all` or `rehearsal` for column QA until verification workflow runs.

## Next

GeoPackage output, photo manifest (`EXP-PHOTOS`), server-side job queue.