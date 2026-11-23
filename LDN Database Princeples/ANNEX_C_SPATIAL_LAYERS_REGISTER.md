# Annex C — National spatial layers register (EMA `important files/`)

**Session:** 60-minute working draft  
**Date:** 2026-11-23  
**Status:** Draft v0.2 — attribute dictionaries for nested archives  
**Custodian folder:** [`../important files/`](../important%20files/)  
**Summary README:** [`../important files/README.md`](../important%20files/README.md)

---

## C.1 Purpose

Register every national spatial asset EMA supplied for the LDN database programme. Each layer gets **metadata**, **intended database table**, **SO/reporting use**, and **access rules** before PostGIS load (Work Plan WP2.4 / WP4.1).

Layers sit in the **National analytics** or **Reference** tiers (Project Guide §5.1), not in field-operations tables.

---

## C.2 Master register

| Layer ID | File / archive | Feature geometry | Record count (approx.) | CRS (expected) | DB target (proposed) | Primary use | SO / standard |
|----------|----------------|------------------|------------------------|----------------|----------------------|-------------|---------------|
| **LDN-NAT-ALL** | `LDN shapefiles.zip` → `Combined ldn shapefiles.*` | Polygon | 254,873 | WGS 84 (`.prj` geographic) | `national_ldn_units` | National validation units; status overlay | SO1 status context |
| **LDN-PROV-*** | Same zip — Byo, Harare, Manicaland, mashcentral, masheast, mashwest, masvingo, matnorth, matsouth, midlands | Polygon | 379–43,455 per file | WGS 84 | `national_ldn_units` (+ `province` attr) | Provincial QA | SO1 |
| **REF-SITES** | `Final Existing sites latest.xls` | Point | 48 | WGS 84 lat/lon | `reference_monitoring_sites` | Training / monitoring sites | Operations |
| **INT-PROJECTS** | `projects.zip` → `ema_projects_combined_geog` (+ UTM) | Point | 47 (geog) / 65×2 UTM | WGS 84 / UTM 35S·36S | `intervention_spatial` | EMA project sites | SO4 / restoration |
| **INT-SBC** | `sbc.zip` → `SBC_LatLong` (+ UTM) | Point | 1,367 (lat/lon) + 156 + 293 UTM | WGS 84 / UTM | `intervention_spatial` (`theme=sbc`) | Soil & water conservation | Restoration |
| **PRESS-INVASIVE** | `invasivespecies.zip` | Point | 2,035 + species splits | WGS 84 / UTM | `pressure_layers` (`theme=invasive`) | Invasive spread | SO1-2 drivers |
| **PRESS-MINING** | `illegalminingshapefiles.zip` | Point | 769 + 203 + 192 UTM | WGS 84 / UTM | `pressure_layers` (`theme=mining`) | Illegal panning | SO2 pressure |

---

## C.3 LDN national polygons — attribute dictionary

Parsed from `Combined ldn shapefiles.dbf` (and consistent across provinces).

| Field | Type | Width | Description | Values (sampled) | National DB column | Compliance notes |
|-------|------|-------|-------------|------------------|-------------------|------------------|
| `Id` | Numeric | 10 | Feature / plot identifier | 1…n | `ldn_unit_id` | **Join key candidate** for Collect Earth / field CEID — confirm with GIS |
| `LD` | Character | 20 | Land degradation **status label** | `Stable`, `Improved`, `Degraded` | `ldn_status_label` | Aligns with GPG **stable / improved / degraded** vocabulary for narrative QA |
| `Area` | Numeric | 19,11 | Area (units per EMA metadata — confirm m² vs ha) | varies | `area_value` + `area_unit` | Required for counterbalancing and zonal stats |
| `OBJECTID` | Numeric | 10 | Esri internal ID | — | `source_object_id` | Migration reference only |

**Sample distribution** (first 5,000 polygons): Stable ≈2,285; Improved ≈1,436; Degraded ≈1,279.

**Geometry:** Polygon; combined file ~54 MB `.shp` in zip — load with versioning (`dataset_version = 1` on first import).

---

## C.4 Existing monitoring sites (spreadsheet)

| Column | Type | DB column | Notes |
|--------|------|-----------|-------|
| District | Text | `district` | Normalise spelling vs `admin_units` |
| Location | Text | `site_name` | |
| Lat | Float | `lat` | WGS 84 |
| Lon | Float | `lng` | WGS 84 |

**Not** validation polygons — reference for operations and coverage maps.

**Import spec (Phase 1):** `backend/migrations/` or one-off script — load 48 rows into `reference_monitoring_sites` with `source_file` = Excel basename, `imported_at` = now().

---

## C.5 EMA projects (`INT-PROJECTS`) — attribute dictionary

Source: `ema_projects_combined_geog.dbf` (n=47). UTM copies (n=65 each) add `size`; prefer **geographic** layer for web map.

| Source field | DB column (proposed) | Notes |
|--------------|----------------------|--------|
| `lat`, `lon` | `lat`, `lng` | WGS 84 |
| `ward` | `ward` | Numeric in DBF — map via `admin_units` |
| `village` | `village` | |
| `year_estab` | `year_established` | |
| `activty` | `activity` | Typo in source; normalise on import |
| `funding_pa` | `funding_partner` | |
| `Role_of_em` / `role` | `ema_role` | |
| `Name` | `project_name` | |
| `size` | `extent_label` | UTM layers only |

**Annex D link:** Merge into `intervention_record` where `Name` + location match.

---

## C.6 Soil & water conservation — SBC (`INT-SBC`)

Primary file: `SBC_LatLong.dbf` (n=1,367). Common fields (all variants):

| Source field | DB column | Notes |
|--------------|-----------|--------|
| `SBCID` | `sbc_id` | Business key |
| `lat`/`lon` or `X`/`Y` | geometry | Store CRS per import |
| `Ward`, `did`, `pid` | admin codes | Join to `admin_units` |
| `Village`, `Chief` | text | |
| `River_name` | `river_name` | |
| `Land_use_c` | `land_use` | |
| `Soil_type` | `soil_type` | |
| `Action_Tak` | `action_taken` | Restoration narrative |
| `Other_prob`, `Biodiversi`, `Major_Spec`, … | JSONB `attributes` | Preserve until EMA defines schema |

---

## C.7 Invasive species (`PRESS-INVASIVE`)

Primary: `Zim_InvasiveLatLong.dbf` (n=2,035). Species-specific UTM zips are **subsets** (e.g. Azolla n=2, Lantana n=262).

| Source field | DB column | Notes |
|--------------|-----------|--------|
| `IASID` | `invasive_site_id` | |
| `LAT`, `LONG` | `lat`, `lng` | |
| `Species` | `species_name` | Link drylands Annex B `invasive_species_name` |
| `Estimate_S`, `Estimate_1` | `extent_estimate` | Confirm units with GIS |
| `Area_clear`, `Area_affec` | `area_cleared`, `area_affected` | |

**Access:** `use_constraint` = **internal** or district — sensitive locations.

---

## C.8 Illegal mining / panning (`PRESS-MINING`)

Primary: `Gold_Chrome_Panning_LatLong.dbf` (n=769).

| Source field | DB column | Notes |
|--------------|-----------|--------|
| `IPID` | `panning_site_id` | |
| `Resource_p` | `resource_type` | Gold / chrome |
| `Num_of_Pit`, pit dimension fields | `pit_metrics` JSONB | Engineering detail |
| `Area_cover` | `area_covered` | |
| `Infra_Eco` | `infrastructure_ecosystem` | |

**Access:** **restricted** national role; optional exclusion from public web map.

---

## C.5b Nested archive index (for GIS unpack)

| Outer zip | Inner shapefile packages |
|-----------|-------------------------|
| `projects.zip` | `ema_projects_combined_geog`, `ema_projects_utm_35`, `ema_projects_utm_36` |
| `sbc.zip` | `SBC_LatLong`, `SBC_UTM35`, `SBC_UTM36` |
| `invasivespecies.zip` | `Zim_InvasiveLatLong`, Lantana UTM35, Azolla UTM36, Water hyacinth UTM36, … |
| `illegalminingshapefiles.zip` | `Gold_Chrome_Panning_LatLong`, UTM35, UTM36 |

---

## C.9 Ingestion metadata template (per layer)

Each import row in `spatial_dataset_catalog` should include:

| Metadata element | Example |
|------------------|---------|
| `dataset_id` | `LDN-NAT-ALL` |
| `title` | Zimbabwe LDN validation polygons (combined) |
| `custodian` | EMA GIS |
| `source_file` | `important files/LDN shapefiles.zip` |
| `vintage` | *(EMA to confirm)* |
| `crs` | EPSG:4326 |
| `imported_at` | ISO timestamp |
| `imported_by` | user/service |
| `confidence` | high / medium / low |
| `use_constraint` | internal \| district \| public_web |

---

## C.10 Integration with OAU platform

| Consumer | Integration |
|----------|-------------|
| Web `/ldn` map | Overlay national unit status (future WMS/GeoJSON API) |
| Validator (mobile) | Field point vs containing `Id` / status polygon |
| Drylands / Annex B | Crosswalk invasive pressure layers |
| Reporting export | GeoPackage layer + metadata sidecar for PRAIS evidence |

**Join hypothesis (to verify):** Mobile `collect_earth_id` ↔ polygon `Id` — GIS workshop required.

---

## C.11 EMA sign-off checklist

- [ ] Confirm area units for `Area` field.  
- [ ] Confirm `Id` ↔ Collect Earth / LDN survey linkage.  
- [ ] Approve which layers are web-public vs internal-only.  
- [ ] Assign `vintage` and update cadence for combined shapefile.  
- [ ] Sign off PostGIS table names and versioning policy.

---

## Document control

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-11-23 | Combined LDN DBF dictionary, register, site spreadsheet |
| 0.2 | 2026-11-23 | Unpacked projects, SBC, invasives, mining — counts + attribute maps |