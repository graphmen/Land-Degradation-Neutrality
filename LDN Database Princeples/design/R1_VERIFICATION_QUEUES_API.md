# Design — Verification workspace queues API

**Route:** `GET /api/verify/queues`  
**Spec parent:** [`VERIFICATION_WORKSPACE_SPEC.md`](../VERIFICATION_WORKSPACE_SPEC.md)

## Usage

| Call | Returns |
|------|---------|
| `GET /api/verify/queues` | Queue counts only |
| `GET /api/verify/queues?queue=locked` | Locked rows (registry shape) |
| `GET /api/verify/queues?queue=submitted&limit=50` | District worklist sample |

**Transitions:** `POST /api/verify/transition` (unchanged)

## Queues

`submitted` · `district` · `national` · `approved` · `locked` · `rejected`

## Flag

`ENABLE_VERIFICATION_QUEUES_API=false` disables route.