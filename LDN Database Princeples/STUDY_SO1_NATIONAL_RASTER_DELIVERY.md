# Study — SO1 national raster delivery (S10–S12)

**Block type:** Study · **Blocks:** F3/F4/F5 · PostGIS not required for this gate  
**Use at R1:** GIS segment [`STEERING_GIS_SO1_DECISION_PACK.md`](./STEERING_GIS_SO1_DECISION_PACK.md)

---

## What EMA must place on disk

**Folder:** `important files/` (repo root)

| Steering | Layer | Preferred filenames | Count |
|----------|-------|---------------------|------:|
| **S10** | LC-NAT-STACK | `lc-national-t0.tif`, `lc-national-t1.tif` | 2 |
| **S11** | LPD-NAT-RASTER | `lpd-national.tif` (or agreed zonal CSV) | 1 |
| **S12** | SOC-NAT-SURFACE | `soc-national-0-30.tif` (or national stock table CSV) | 1 |

Glob patterns in `scripts/national_raster_qc.py` accept reasonable variants; **steering should still sign canonical names**.

---

## QC commands (chair)

| When | Command |
|------|---------|
| Before files exist | `npm run qc:rasters:checklist` |
| After drop | `npm run qc:rasters` (uses `gdalinfo` if on PATH) |
| Full programme | `npm run qc:refresh` |
| API | `GET /api/qc/summary` → `national_rasters` |
| §F gates | `GET /api/config/reporting-dry-run` → `s10_f3`, `s11_f4`, `s12_f5` |

**Report JSON:** `public/qc-national-rasters-report.json`

---

## Steering questions (from import plans — one line each)

| ID | Layer | Ask |
|----|-------|-----|
| T1–T4 | LC | Trends.Earth vs EMA national LC authority; years; legend |
| L1–L4 | LPD | VI source; class legend; resampling policy |
| O1–O4 | SOC | Stock vs %; 0–30 cm definition; Tier-2 lab linkage |

Detail: [`corpus/metadata/LC-NAT-STACK_IMPORT_PLAN.md`](./corpus/metadata/LC-NAT-STACK_IMPORT_PLAN.md) · LPD · SOC plans.

---

## Honest status today (Nov 2026)

| Package | Rehearsal | Reason |
|---------|-----------|--------|
| EXP-META | ✅ | 13-layer register |
| EXP-SO1-FIELD | ✅ | 150/632/16 field rows |
| EXP-SO1-LC/LPD/SOC | 🔶 template | **Await files + S10–S12** |
| PRAIS SO1-4 (1OAO) | 🔶 partial | National sub-indicators incomplete |

**Do not claim** national km² in SO1 tables until rasters pass QC + zonal stats job exists.

---

## Delivery checklist (GIS lead signs)

| ☐ | Item |
|---|------|
| ☐ | Files copied to `important files/` with signed names |
| ☐ | `npm run qc:rasters` — `delivery_ready: true` per layer |
| ☐ | Steering minutes cite **S10, S11, S12** |
| ☐ | Metadata row updated in [`CORPUS_METADATA_REGISTER.md`](./corpus/CORPUS_METADATA_REGISTER.md) |

---

*Parent:* [`REPORTING_DESK_F3_S10_GATE.md`](./design/REPORTING_DESK_F3_S10_GATE.md) · [`NATIONAL_DATA_CORPUS.md`](./NATIONAL_DATA_CORPUS.md)