# Design — Mobile CEID validator (post-Q2)

**Status:** v0.1 · **Implements:** Capacitor forms · **No dashboard UI**

**API:** `GET /api/validator/ceid?ceid={ceid}&rule=second_segment`

---

## Response handling

| Condition | Mobile UX |
|-----------|-----------|
| `match: true`, `match_via: join_rule` | Show national unit `ld_class`, polygon count; green hint |
| `match: true`, `match_via: alias` | Show unit + label “Resolved legacy ID (alias register)” |
| `match: false`, `alias_status: pending_ema` | Amber: “Legacy CEID — GIS mapping pending”; **allow save** with flag |
| `match: false`, `alias_status: retired` | Red banner: “Retired ID — resubmit with grid CEID” |
| Offline | Bundled subset of `national-unit-ld-index.json` (numeric ids only) |

---

## Non-goals (v1)

- No client-side guess of `shapefile_id` for `ZC*` tokens  
- No auto-lock from mobile  

**Parent:** [`CEID_VALIDATOR_API.md`](../corpus/metadata/CEID_VALIDATOR_API.md) · [`CEID_ALIAS_REGISTER.md`](./CEID_ALIAS_REGISTER.md)