# EMA national datasets — `important files`

**Custodian:** Environment Management Agency (EMA) — LDN programme  
**Received:** November 2026  
**Purpose:** Reference and analytics layers for the **national LDN database** (Deliverable A). These assets support SO1 context, field validation, drylands / restoration reporting, and spatial QA — they are **not** a substitute for governed field submissions from the **EMA mobile app (Android/iOS)**.

> Store authoritative copies on EMA government backup. This folder is the project working copy linked to the OAU repository.

---

## File register

| File | Size (approx.) | Content (summary) | Intended DB layer | SO / programme link |
|------|----------------|-------------------|-------------------|---------------------|
| `LDN shapefiles.zip` | ~49 MB | Provincial and **Combined LDN shapefiles** (`.shp`/`.dbf`/…), including Midlands, Bulawayo (Byo), Harare, etc. | National analytics + reporting context | SO1 national units; validator overlays |
| `Final Existing sites latest.xls` | ~60 KB | Sheet **Existing sites**: District, Location, Lat, Lon (~48 rows) | Reference: monitoring / training sites | Field operations; QA of coverage |
| `projects.zip` | ~15 KB | **47** geog points (+ UTM copies); see Annex C §C.5 | `intervention_record` / restoration spatial | SO4 / implementation; bright-spot evidence |
| `sbc.zip` | ~139 KB | **1,367** SBC points (Lat/Long) + UTM subsets | Intervention / conservation spatial | Land restoration, erosion control |
| `invasivespecies.zip` | ~125 KB | **2,035** invasive points (+ species splits) | Pressure / threat layer | SO1-2 context; degradation drivers |
| `illegalminingshapefiles.zip` | ~56 KB | **769** panning points (+ UTM) | Pressure / threat layer | SO2 exposure; land degradation pressure |

---

## Ingestion principles (compliance)

1. **Metadata first** — For each dataset: title, owner, vintage, CRS, scale, licence, and confidence before loading to PostGIS.
2. **CRS harmonization** — Register all imports in WGS 84 for web; retain UTM 35S/36S copies where field teams work in projected coords.
3. **No silent overwrite** — Version datasets (`dataset_version`, `imported_at`); national LDN combined shapefile updates are new versions, not in-place edits.
4. **Separation of layers** — Field observations (mobile app) stay in **field operations** tables; these shapefiles live in **national analytics** or **reference** layers (see project guide §5.1).
5. **PII / sensitivity** — Mining and site locations may be sensitive; apply EMA access rules in the API (district vs national roles).

---

## Planned technical actions (Work Plan WP-GEO)

| Step | Action | Phase |
|------|--------|-------|
| 1 | Unpack & validate geometry (`ogrinfo`, topology check) | Phase 1 |
| 2 | Load `Combined ldn shapefiles` → `national_ldn_units` (or equivalent) with province/district attributes | Phase 2 |
| 3 | Load existing sites XLS → `reference_monitoring_sites` | Phase 1 |
| 4 | Load projects, SBC, invasives, illegal mining as themed layers with code-list tags | Phase 2–4 |
| 5 | Link validator app / web map to layer registry (toggle + attribution) | Phase 3 |
| 6 | Document lineage in PRAIS export metadata | Phase 4 |

---

## Corpus metadata (versioning)

All layers must appear in [`LDN Database Princeples/corpus/CORPUS_METADATA_REGISTER.md`](../LDN%20Database%20Princeples/corpus/CORPUS_METADATA_REGISTER.md) before PostGIS load.

## Related project documents

- [`../LDN Database Princeples/ZIMBABWE_LDN_PROJECT_GUIDE.md`](../LDN%20Database%20Princeples/ZIMBABWE_LDN_PROJECT_GUIDE.md)  
- [`../LDN Database Princeples/ZIMBABWE_LDN_WORK_PLAN.md`](../LDN%20Database%20Princeples/ZIMBABWE_LDN_WORK_PLAN.md)  
- [`../LDN Database Princeples/ANNEX_A_FIELD_MAPPING.md`](../LDN%20Database%20Princeples/ANNEX_A_FIELD_MAPPING.md)