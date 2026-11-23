# R1 steering — live API demo script (~12 min)

**Prereq:** `npm run dev` (or production host) · `npm run r1:smoke` (preflight) · national HTTPS for mobile tablet optional  
**No demo:** legacy home dashboard as “the product”

| # | Call | Speak to |
|---|------|----------|
| 1 | `GET /api/status` | Programme routes list; `locked_ldn_exports: 3` pilot |
| 2 | `GET /api/national-overview` | `field_evidence` 150/632/16, SO1 %, verification backlog |
| 3 | `GET /api/qc/summary` | 254k polygons, 2804 pressure staging, CEID 93/147 |
| 4 | `GET /api/corpus-layers` | 13 layers; `staging_json` pressure/SBC/projects |
| 5 | `GET /api/validator/ceid?ceid=11268_17236` | Mobile CEID hint (grid match) |
| 5b | `GET /api/validator/ceid?ceid=ZC2` | Legacy token → `pending_ema` (alias register) |
| 6 | `GET /api/evidence/summary` | 798 total; locked by type; status histogram |
| 6b | `GET /api/evidence/registry?prais_eligible=true` | Locked rows only (3) |
| 7 | `GET /api/verify/queues?queue=locked` | Verification workspace preview |
| 8 | `GET /api/pressure-layers?theme=invasive` | `count` only if sensitive (national role) |
| 9 | `GET /api/interventions?includeEma=true&includeSbc=true` | National programme points (auth) |
| 10 | `GET /api/config/s2-preflight` | S2 Phase A+B files ready (after `npm run s2:preflight`) |
| 11 | `GET /api/config/reporting-dry-run` | §F gates; `gates.lock_policy` (3 LDN locked, pilot mode) |
| 11b | `GET /api/config/verification-lock-policy` | Draft minimums — null until steering signs |
| 12 | `GET /api/export/meta` | EXP-META rehearsal |

**Word attach:** `npm run export:steering-docx`

**Sign-off:** [`R1_STEERING_SIGN_OFF_PACK.md`](./R1_STEERING_SIGN_OFF_PACK.md) §9