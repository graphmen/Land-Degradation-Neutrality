# Block review — Design + Build: Evidence registry API

| Item | Value |
|------|--------|
| **Block type** | Design + Build (API only) |
| **Outcome met?** | **Yes** |

## Delivered

- [`design/R1_EVIDENCE_REGISTRY_API.md`](./design/R1_EVIDENCE_REGISTRY_API.md)
- `GET /api/evidence/registry` — LDN + soil + drylands reconciled rows
- `loadReconciledDrylandsRecords()` in reconcile helper

## Demo

`GET /api/evidence/registry?prais_eligible=true` (3 LDN locked pilot)

## Next

**Steering** — R1 sign-off, or **Build** — verification queue API filter by status.