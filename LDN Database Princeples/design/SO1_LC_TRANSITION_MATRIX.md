# Design — SO1-1 land cover transition matrix (`EXP-SO1-LC`)

**Status:** Draft v0.1 · **Block:** Design (reporting desk, no web UI)  
**Links:** Annex E §E.5 · [`REPORTING_DESK_CHECKLIST.md`](../REPORTING_DESK_CHECKLIST.md) · `reference-code-lists.v0.9.json` (`ldn_land_cover_national`)

---

## 1. Purpose

Define how Zimbabwe assembles the **PRAIS SO1-1** land cover **transition table** (km² from each UNCCD class at baseline **t₀** to each class at reporting **t₁**), separate from:

- **LDN-NAT-ALL** polygons (`LD` = Stable / Improved / Degraded) — status for SO1-4 / national narrative, not LC transitions  
- **FIELD-LDN** — validation and QA counts, not the primary national transition surface  

---

## 2. UNCCD 7-class row/column order (export default)

Use PRAIS-consistent labels (storage codes lowercase snake):

| Code | PRAIS label |
|------|-------------|
| `tree_covered` | Tree-covered |
| `grassland` | Grassland |
| `cropland` | Cropland |
| `wetland` | Wetland |
| `artificial` | Artificial |
| `other_land` | Other land |
| `water` | Water |

**7×7 core matrix** + optional **national subclass** appendix (not uploaded to PRAIS unless approved).

---

## 3. National → UNCCD mapping (field + mobile)

From `ldn_land_cover_national` (v0.9 draft — **EMA sign-off pending**):

| National `code` | UNCCD class | Notes |
|-----------------|-------------|--------|
| `cropland` | Cropland | |
| `tree_forest` | Tree-covered | |
| `bush_shrub` | Tree-covered | Steering: grassland vs tree rule |
| `grassland` | Grassland | |
| `plantation` | Tree-covered | Flag `plantation=true` in metadata |
| `baresoil` | Other land | |
| `wetland` | Wetland | |
| `settlement` | Artificial | |

Historical Kobo subclasses on legacy records are harmonised on **read** via ETL → national `code` → UNCCD class above.

---

## 4. Authoritative transition surface (national analytics)

| Tier | Source (corpus) | Role in SO1-1 |
|------|-----------------|---------------|
| **Primary** | [`LC-NAT-STACK`](../corpus/metadata/LC-NAT-STACK_IMPORT_PLAN.md) **t₀** and **t₁** (Trends.Earth default or Zimbabwe national LC) | Zonal tabulation → km² matrix |
| **QA** | FIELD-LDN + REF-SITES | Spot-check discordant cells; workshop minutes |
| **Context** | PRESS-* layers | Narrative for degradation drivers, not matrix cells |

**Procedure (reporting officer):**

1. Register rasters in Annex C with `reporting_period`, CRS, vintage.  
2. Run GPG-aligned transition workflow (same legend t₀/t₁).  
3. Emit `EXP-SO1-LC` (below).  
4. Compare 10–20 hotspots to `EXP-SO1-FIELD` (`matches_baseline_lc` where captured).

---

## 5. `EXP-SO1-LC` package shape

**Files:**

- `transitions_km2.csv` — long format (preferred for QA)  
- `transitions_km2_pivot.csv` — wide 7×7 (+ totals) for desk review  
- `metadata.json` — lineage, periods, methods, `data_tier`, confidence  

**Long format columns:**

| Column | Required | Example |
|--------|----------|---------|
| `from_unccd_class` | Yes | `grassland` |
| `to_unccd_class` | Yes | `cropland` |
| `area_km2` | Yes | `1240.55` |
| `baseline_period_id` | Yes | `t0_end_2015` |
| `reporting_period` | Yes | `2020-2023` |
| `data_tier` | Yes | `tier2_national` |
| `source_layer_id` | Yes | `LC-NAT-STACK` (registry TBD) |
| `dataset_version` | Yes | `1` |
| `confidence` | Yes | `medium` |

**Pivot totals row/column:** must reconcile with sum of national LC extent by period (±0.1 km² rounding).

---

## 6. Field contribution (supporting, not substitute)

| Field export | Use in transition QA |
|--------------|----------------------|
| `unccd_land_cover_class` @ t₁ | Compare to raster class at point |
| `matches_baseline_lc` | Enumerator assertion vs raster t₀ |
| `verification_status` = `locked` | Only rows in `EXP-SO1-FIELD` |

Do **not** build SO1-1 from 150 points alone; aggregate field mismatches into a **QA annex** for national expert sign-off.

---

## 7. Open steering questions

| # | Question | Blocks |
|---|----------|--------|
| T1 | Authoritative national LC rasters — Trends.Earth default vs EMA national | Raster registration + first matrix |
| T2 | `bush_shrub` → Tree-covered vs Grassland | Code list v1.0 |
| T3 | Baseline t₀ year lock (2015 end) vs workshop sub-periods | `baseline_period_id` config |
| T4 | Water class: include in matrix vs extent-only column | PRAIS desk format |

---

## 8. Implementation phases (backend only)

| Phase | Action |
|-------|--------|
| P1 | Config table `reporting_period` + `baseline_period_id` |
| P2 | `export_job` stub `EXP-SO1-LC` reading PostGIS zonal stats (after LC rasters loaded) |
| P3 | QA report: field points vs raster class at t₀/t₁ |

No new government web UI until **R1** sign-off.