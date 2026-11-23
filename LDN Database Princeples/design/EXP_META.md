# Export job — `EXP-META` (corpus manifest v0.1)

**Annex E §E.5** · PRAIS supporting metadata · Reporting desk **F1**

## API

`GET /api/export/meta?format=json|csv&write=1`

## Contents

- **10** corpus layers aligned with [`CORPUS_METADATA_REGISTER.md`](../corpus/CORPUS_METADATA_REGISTER.md)
- Feature counts from QC JSON where available
- **F1 validation:** every row has `custodian` + `vintage`

## Outputs (with `write=1`)

`exports/{period}/EXP-META/` — `corpus_layers.csv`, `corpus_layers.json`, `metadata.json`

## Related

- Per-layer Annex II: `corpus/metadata/*_METADATA.yaml`
- LC transitions template: `GET /api/export/so1-lc`