# Import plan — LC-NAT-STACK (national land cover t₀/t₁)

**Layer ID:** LC-NAT-STACK · **Block:** Data (plan only — **no raster load in this step**)  
**Target:** PostGIS catalogue + zonal stats → `EXP-SO1-LC` (replaces template in `lib/exp-so1-lc-export.ts`)  
**Design:** [`SO1_LC_TRANSITION_MATRIX.md`](../../design/SO1_LC_TRANSITION_MATRIX.md)

---

## 1. Purpose

Supply the **authoritative 7×7 land cover transition matrix** (km²) for PRAIS SO1-1. This is **not** the LDN-NAT-ALL polygon layer (`LD` status) and **not** built from FIELD-LDN points alone.

| Component | Corpus ID | Role |
|-----------|-----------|------|
| Baseline LC | `LC-T0` (within stack) | Column classes at **t₀** |
| Reporting LC | `LC-T1` (within stack) | Row classes at **t₁** |
| QA | FIELD-LDN + REF-SITES | Point checks vs raster |

---

## 2. Source options (steering **T1** — pick one before load)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | Trends.Earth default national export | Fast GPG alignment; UNCCD legend | May not match EMA field `ldn_land_cover_national` |
| **B** | EMA national LC raster(s) harmonized to UNCCD 7-class | Matches workshops + mobile | Requires legend sign-off (T2) + delivery |
| **C** | Hybrid — Trends.Earth for matrix, EMA for QA appendix | Rehearsal friendly | Extra metadata; PRAIS citation complexity |

**Delivery location (when signed):** `important files/` — e.g. `lc-national-t0.tif`, `lc-national-t1.tif` or GeoTIFF stack + symbology table.

---

## 3. Open questions (block first km² values)

| # | Question | Doc |
|---|----------|-----|
| **T1** | Authoritative raster source (A/B/C) | This plan |
| **T2** | `bush_shrub` → Tree-covered vs Grassland | Annex F / code lists |
| **T3** | Baseline year lock (`baseline_period_id`) | `reporting-period-config.json` |
| **T4** | Water in 7×7 vs extent-only column | PRAIS desk format |

---

## 4. Pre-load QA (when files arrive)

Checklist for GIS lead:

- [ ] Both bands share **identical grid** (extent, resolution, CRS) or documented resample method  
- [ ] Legend maps 1:1 to UNCCD classes (see design doc §2)  
- [ ] No-data policy documented (water mask, cloud, admin boundaries)  
- [ ] National → UNCCD remap table versioned (`code_list_version`)  
- [ ] Trend/crosswalk notebook or QGIS project archived for audit  

**Suggested commands (local):**

```powershell
gdalinfo "important files\lc-national-t0.tif"
gdalinfo "important files\lc-national-t1.tif"
# Optional: python scripts/lc_stack_qc.py --t0 ... --t1 ...
```

---

## 5. Load procedure (after T1–T4 + S1 code lists)

1. Register stack in [`CORPUS_METADATA_REGISTER.md`](../CORPUS_METADATA_REGISTER.md) (`import_status` → `catalogued`).  
2. Draft migration `006_lc_raster_catalog.sql` (catalogue table + tile pointers — **not in repo until S2 Phase D GIS slot**).  
3. Import rasters to PostGIS `raster` or COG on object storage with `layer_id = LC-NAT-STACK`.  
4. Run **zonal tabulation** (national boundary or reporting units from `LDN-NAT-ALL` once Q1/Q2 signed).  
5. Emit `transitions_km2.csv` per design §5; wire `buildExpSo1LcPackage` P2.  
6. QA report: sample FIELD-LDN locked points vs `LC-T0`/`LC-T1` classes.  
7. Update `public/reporting-desk-dry-run.json` — expect **F3 pass** when `area_km2` populated.

---

## 6. Platform behaviour (post-R1)

- **Reporting desk** reads catalogue metadata only until R1; no new web map chrome.  
- Export API adds `GET /api/export/so1-lc?mode=locked` when matrix is national-signed.  
- `source_layer_id` on each matrix row = `LC-NAT-STACK`.

---

## 7. Status

⬜ **Awaiting EMA file drop + T1 decision** — register row and YAML exist; `EXP-SO1-LC` remains `template_only`.