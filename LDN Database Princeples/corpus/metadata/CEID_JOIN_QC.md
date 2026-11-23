# CEID ↔ national polygon `Id` — join QA

**Layer:** LDN-NAT-ALL · **Field corpus:** FIELD-LDN (`public/ldn-data.json`, 150 records)  
**Script:** [`scripts/ceid_join_qc.py`](../../../scripts/ceid_join_qc.py) · **Report:** [`public/qc-ceid-join-report.json`](../../../public/qc-ceid-join-report.json)

---

## Shapefile profile (Combined layer)

| Metric | Value |
|--------|------:|
| Polygons | 254,873 |
| Unique `Id` | 43,455 |
| Mean polygons per `Id` | ~5.87 |
| `LD` classes | Improved, Stable, Degraded (majority) |
| `Area` (numeric) | min ~4.6, mean ~153, max ~3.68e6 — **units unconfirmed (Q1)** |

Many field CEIDs will join to **one national unit** that is represented by **several** polygons sharing the same `Id`.

---

## CEID format (field sample)

- Dominant: `wardId_pointId` e.g. `11268_17236`
- Triple: `11544_17104_1` (revisit / sub-plot — EMA rule needed)
- Non-numeric tokens: `ZC*`, `HP1`, `Muchawona`, `PLR4` — **no** match to numeric `Id` in automated QC

---

## Match strategies tested (unique CEIDs = 147)

| Rule | Matches | Rate |
|------|--------:|-----:|
| Suffix after first `_` | 89 | 0.605 |
| **Second segment** (`parts[1]`) | **93** | **0.633** |
| Last segment | 93 | 0.633 |
| First segment (ward only) | (see report) | — |
| Full CEID string | 0 | 0 |

**Interim engineering assumption:** use **second segment** as shapefile `Id` until EMA signs Q2. Triple-part IDs that match only via middle segment support this.

---

## Steering actions

1. **Q1** — confirm `Area` unit before `area_ha` / zonal stats.  
2. **Q2** — publish authoritative CEID grammar (incl. `ZC*`, named sites, `_1` suffix).  
3. **Q3** — on join hit, expose **union of polygons** or single representative geometry for mobile QA?

Re-run after rule is signed:

```powershell
python scripts/ceid_join_qc.py
```

Update [`LDN-NAT-ALL_IMPORT_PLAN.md`](./LDN-NAT-ALL_IMPORT_PLAN.md) §3 checklist and load procedure in `002`.