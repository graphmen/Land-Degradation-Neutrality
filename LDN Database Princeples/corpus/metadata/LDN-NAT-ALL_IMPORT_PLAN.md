# Import plan — LDN-NAT-ALL (Combined LDN shapefiles)

**Layer ID:** LDN-NAT-ALL · **Block:** Data (plan only — **no ogr2ogr in this step**)  
**Target table:** `ldn.national_ldn_units` (`002_national_ldn_units.sql`)

---

## 1. Source

| Item | Value |
|------|--------|
| Archive | `important files/LDN shapefiles.zip` |
| Layer | `Combined ldn shapefiles.shp` (+ dbf/shx/prj) |
| Features | 254,873 polygons |
| Attributes | `Id`, `LD`, `Area`, `OBJECTID` (see Annex C §C.3) |

---

## 2. Open questions for EMA (block load until answered)

| # | Question | Impact |
|---|----------|--------|
| Q1 | **`Area` unit** — hectares, m², or other? | `area_unit` column; zonal stats |
| Q2 | **`Id` ↔ mobile `ceid`** — 1:1 rule? Format normalization? | Validator join, FK design |
| Q3 | Simplification for API? (tolerance metres) | Tile performance vs fidelity |
| Q4 | Authoritative copy — zips on laptop vs government backup? | Lineage + version |

---

## 3. Pre-load QA (run once unzipped)

```powershell
ogrinfo -al -so "important files\...\Combined ldn shapefiles.shp"
```

Checklist:

- [x] CRS matches `.prj` (expect EPSG:4326) — confirm at ogrinfo before load  
- [x] `Id` cardinality — **43,455** unique over **254,873** polygons (~5.87 per Id)  
- [x] `LD` domain — Improved / Stable / Degraded (see `qc-ceid-join-report.json`)  
- [ ] Null geometries = 0 (ogrinfo)  
- [x] CEID join QA — [`CEID_JOIN_QC.md`](./CEID_JOIN_QC.md) · **93/147** interim (`second_segment`)

---

## 4. Load procedure (after Q1–Q2 signed)

1. Apply `002_national_ldn_units.sql`  
2. Set `dataset_version = 1`, `imported_at`, `imported_by`  
3. ogr2ogr as in [`IMPORT_NATIONAL_LDN_UNITS.md`](../../IMPORT_NATIONAL_LDN_UNITS.md)  
4. Post-SQL counts by `ldn_status_label`  
5. Register completion in [`CORPUS_METADATA_REGISTER.md`](../CORPUS_METADATA_REGISTER.md)

---

## 5. Platform behaviour (R1 module)

- **Land cover & LDN units** map reads this table (not raw shapefile on disk).  
- Field evidence links: `ceid` → `ldn_unit_id` when Q2 confirmed.  
- **Not** loaded into field-operations tables.

---

## 6. Rollback

- Keep zip version tag in git LFS or EMA backup only; DB rollback = `TRUNCATE ldn.national_ldn_units` + reimport prior `dataset_version`.