# Design — CEID alias register (Q2 supplement)

**Status:** v0.1 draft · **Steering gate:** **Q2** · **Does not block** S2 Phase A+B

**Parent:** [`CEID_UNMATCHED_STUDY.md`](../corpus/metadata/CEID_UNMATCHED_STUDY.md)

---

## 1. Problem

**93/147** CEIDs join via `second_segment`. **54** legacy tokens (`ZC*`, `ZE*`, named sites) need an **EMA-owned mapping** — not guessed in code.

---

## 2. Artefact

| File | Role |
|------|------|
| `public/reference-ceid-aliases.v0.1.json` | Alias table (draft — all `pending_ema` until workshop) |
| Regen | `npm run build:ceid-aliases` after `npm run qc:ceid` |

### Entry schema

| Field | Type | Notes |
|-------|------|-------|
| `ceid` | string | Exact field token (case-sensitive) |
| `category` | enum | From QC: `legacy_zc_ze_token`, `named_or_short_token`, … |
| `shapefile_id` | string \| null | Target national unit `Id` when EMA approves |
| `resolution` | `pending_ema` \| `approved` \| `retired` | Governance |
| `notes` | string \| null | Workshop minutes |
| `approved_by` | string \| null | Officer name |
| `approved_at` | ISO date \| null | |

---

## 3. Resolver order (platform)

```
1. Apply join rule (default second_segment) → national unit index
2. Else lookup alias register where resolution = approved and shapefile_id set
3. Else if alias pending → match false, alias_status = pending_ema (no fake polygon)
4. Else match false
```

**Code:** `lib/ceid-join.ts` · **API:** `GET /api/validator/ceid` exposes `match_via`, `alias_status`

---

## 4. Future database (post-S2 optional)

Extension table `ceid_alias` (migration **006** — not drafted until Q2 signed):

- FK optional to field submission UUID when known  
- Audit row on change  
- Seed from JSON one-time import script  

---

## 5. Workshop workflow

1. Export Word GIS pack with unmatched list (from JSON).  
2. EMA fills `shapefile_id` + `resolution: approved` for each row or marks `retired`.  
3. Workshop return: `npm run import:ceid-aliases` (CSV → JSON).  
4. `npm run build:ceid-aliases` adds new unmatched **without wiping** approved/retired rows.  
5. Re-run `npm run qc:ceid` to confirm improved match rate.

---

## 6. Sign-off (Q2 partial)

- [ ] Accept **second_segment** for numeric `ward_point` CEIDs  
- [ ] Delegate owner for alias register maintenance  
- [ ] Agree retired vs mapped policy for `ZC*` campaigns