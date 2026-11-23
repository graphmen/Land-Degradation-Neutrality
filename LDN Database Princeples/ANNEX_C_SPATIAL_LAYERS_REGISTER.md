# Annex C — National spatial layers register (EMA `important files/`)

**Session:** 60-minute working draft  
**Date:** 2026-11-23  
**Status:** Draft for GIS lead sign-off  
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
| **INT-PROJECTS** | `projects.zip` → nested project zips | *TBD unpack* | *TBD* | Lat/long + UTM 35/36 | `intervention_spatial` | EMA project footprints | SO4 / restoration |
| **INT-SBC** | `sbc.zip` | *TBD unpack* | *TBD* | Lat/long + UTM | `intervention_spatial` (theme=sbc) | Soil & water conservation | Restoration |
| **PRESS-INVASIVE** | `invasivespecies.zip` | *TBD unpack* | *TBD* | Lat/long + UTM | `pressure_layers` | Invasive spread | SO1-2 drivers |
| **PRESS-MINING** | `illegalminingshapefiles.zip` | *TBD unpack* | *TBD* | Lat/long + UTM | `pressure_layers` | Illegal mining / panning | SO2 pressure |

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

---

## C.5 Nested archives (pending unpack schema)

| Archive | Inner packages | Next session action |
|---------|----------------|---------------------|
| `projects.zip` | `ema_projects_combined_geog.zip`, UTM 35, UTM 36 | List layers/attributes → update §C.2 counts |
| `sbc.zip` | `SBC_LatLong.zip`, UTM variants | Theme tag `sbc` |
| `invasivespecies.zip` | Species-specific zips (Lantana, Azolla, water hyacinth) | Theme tag + link drylands `invasive_species_name` |
| `illegalminingshapefiles.zip` | Gold/chrome panning | Restricted role access |

---

## C.6 Ingestion metadata template (per layer)

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

## C.7 Integration with OAU platform

| Consumer | Integration |
|----------|-------------|
| Web `/ldn` map | Overlay national unit status (future WMS/GeoJSON API) |
| Validator (mobile) | Field point vs containing `Id` / status polygon |
| Drylands / Annex B | Crosswalk invasive pressure layers |
| Reporting export | GeoPackage layer + metadata sidecar for PRAIS evidence |

**Join hypothesis (to verify):** Field `geninfo/ceid` / Collect Earth point ID ↔ polygon `Id` — GIS workshop required.

---

## C.8 EMA sign-off checklist

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