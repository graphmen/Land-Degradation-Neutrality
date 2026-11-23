# Study — unmatched field CEIDs (Q2 input)

**Block type:** Study · **Date:** 2026-11-23  
**Data:** [`public/qc-ceid-join-report.json`](../../../public/qc-ceid-join-report.json) · **Refresh:** `npm run qc:ceid`

---

## Summary for steering (GIS segment)

| Metric | Value |
|--------|------:|
| Field records with CEID | 150 |
| Unique CEIDs | 147 |
| Match under **second_segment** → shapefile `Id` | **93** (63.3%) |
| **Unmatched** | **54** (36.7%) |

**Finding:** Every **numeric `ward_point` CEID** that fails under `second_segment` is **absent** from this QC run’s failure taxonomy — the 54 unmatched are **not** bad joins on otherwise valid grid IDs. They are **legacy / alternate vocabularies** that never map to numeric `Id` in the combined layer.

---

## Unmatched categories (interim rule: `second_segment`)

| Category | Count | Examples | Engineering read |
|----------|------:|----------|-------------------|
| **legacy_zc_ze_token** | 30 | `ZC2`…`ZC29`, `ZE1`…`ZE13` | Pre-grid or zonal campaign codes — need EMA mapping table |
| **named_or_short_token** | 24 | `HP1`, `Muchawona`, `PLR4`, `Zw9` | Named sites / pilot labels — manual alias list |

**No `double_segment_no_id_match` in current 150-row corpus** under `second_segment` — if EMA confirms Q2, mobile hint accuracy for standard grid CEIDs is already high.

---

## International contrast (Study — Botswana twin)

Botswana’s Collect Earth workflow assumes **stable plot IDs on a national grid** with ministry QA. Zimbabwe’s **93/147** grid-aligned rows match that model; the **54 legacy tokens** resemble **Kenya-style fragmentation** (multiple naming regimes in one programme) rather than Botswana’s single grid discipline.

**Steering choice (proposed):**

1. **Freeze** `second_segment` for all `^\d+_\d+` CEIDs (S4 partial).  
2. **Publish** `reference-ceid-aliases.v0.1.json` for ZC/ZE/named sites — see [`design/CEID_ALIAS_REGISTER.md`](../../design/CEID_ALIAS_REGISTER.md) · `npm run build:ceid-aliases`.  
3. **Do not** block S2 Phase A+B on alias table — aliases block **PostGIS 002 load** and **validator certainty**, not code lists.

---

## Questions for GIS workshop (15 min)

| # | Ask EMA |
|---|---------|
| W1 | Is `Id` always the **Collect Earth point id** (second segment), not ward? |
| W2 | Provide official list: **ZC\*** / **ZE\*** → numeric `Id` or retire those rows? |
| W3 | Named sites (`Muchawona`, etc.) — one-off polygons or exclude from national join? |
| W4 | Triple CEIDs (`11544_17104_1`) — is revisit suffix **ignored** for join? (Current rule: middle segment — confirm.) |

---

## Platform behaviour until Q2 signed

| Surface | Behaviour |
|---------|-----------|
| Mobile CEID blur | Hint when `second_segment` ∈ shapefile ids |
| Validator API | Returns match flag + interim rule in metadata |
| Unmatched legacy | Show “legacy token — GIS alias pending”; **no** fake polygon |
| PostGIS **002** | **Blocked** until Q2 + Q1 |

---

## Artefacts to update after workshop

- [`CEID_JOIN_QC.md`](./CEID_JOIN_QC.md)  
- [`CEID_VALIDATOR_API.md`](./CEID_VALIDATOR_API.md)  
- [`STEERING_GIS_SO1_DECISION_PACK.md`](../../STEERING_GIS_SO1_DECISION_PACK.md) §A  
- Re-run `npm run qc:ceid` · `npm run qc:summary`

*Parent study:* [`BLOCK_REVIEW_2026-11-23_study-ceid-unmatched.md`](../../BLOCK_REVIEW_2026-11-23_study-ceid-unmatched.md)