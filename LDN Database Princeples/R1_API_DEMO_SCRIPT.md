# R1 steering — live API demo script (~12 min)

**Prereq:** `npm run dev` (or production host) · national HTTPS for mobile tablet optional  
**No demo:** legacy home dashboard as “the product”

| # | Call | Speak to |
|---|------|----------|
| 1 | `GET /api/status` | Programme routes list; `locked_ldn_exports: 3` pilot |
| 2 | `GET /api/national-overview` | R2 landing JSON — corpus health, SO1 %, backlog |
| 3 | `GET /api/qc/summary` | 254k polygons, 2804 pressure staging, CEID 93/147 |
| 4 | `GET /api/corpus-layers` | 13 layers; `staging_json` pressure/SBC/projects |
| 5 | `GET /api/validator/ceid?ceid=11268_17236` | Mobile CEID hint backend |
| 6 | `GET /api/evidence/registry?prais_eligible=true` | Locked rows only (3) |
| 7 | `GET /api/verify/queues?queue=locked` | Verification workspace preview |
| 8 | `GET /api/pressure-layers?theme=invasive` | `count` only if sensitive (national role) |
| 9 | `GET /api/interventions?includeEma=true&includeSbc=true` | National programme points (auth) |
| 10 | `GET /api/export/meta` | EXP-META rehearsal |
| 11 | `npm run reporting:dry-run` (offline) | §F gates: s10_f3, s11_f4, s12_f5 |

**Word attach:** `npm run export:steering-docx`

**Sign-off:** [`R1_STEERING_SIGN_OFF_PACK.md`](./R1_STEERING_SIGN_OFF_PACK.md) §9