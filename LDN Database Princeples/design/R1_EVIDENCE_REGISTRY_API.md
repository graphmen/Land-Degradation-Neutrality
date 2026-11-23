# Design — Evidence registry API (R1 §5)

**Status:** v0.1 preview · **UI:** R2 only — use JSON for steering demos  
**Route:** `GET /api/evidence/registry`

## Query params

| Param | Values |
|-------|--------|
| `type` | `ldn` \| `soil` \| `drylands` |
| `verification_status` | Annex E state |
| `prais_eligible` | `true` → `locked` only |
| `limit` | default 500, max 2000 |
| `offset` | pagination |

## Row shape

Matches R1 wireframe columns: `record_id`, `evidence_type`, CEID (LDN), governance fields, `prais_eligible`.

## Data source

Reconciled cache + `*-modifications.json` — same as exports (`loadReconciled*`).

## Flag

`ENABLE_EVIDENCE_REGISTRY_API=false` disables route.

## Non-goals (v1)

- No Kobo live merge in registry (use `/api/ldn` legacy)
- No write — use `/api/submit/*` and `/api/verify/*`