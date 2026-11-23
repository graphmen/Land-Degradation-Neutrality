# Block review — Data: INT-SBC staging (1364 staged)

| Item | Value |
|------|--------|
| **Block type** | Data |
| **Outcome met?** | **Yes** |

## Delivered

- `scripts/import_sbc_staging.py` → **1364** points (QC 1367; 3 invalid lat/lon skipped)
- `GET /api/interventions?includeSbc=true` (opt-in merge)
- Corpus INT-SBC → `staging_json`

## Next

**Build** — `GET /api/corpus-layers` for R2 hub, or **Steering** — Word pack via `convert_to_docx.py` for R1 meeting.