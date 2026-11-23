# Annex B — ILUP Drylands: field → database → programme mapping

**Session:** 60-minute working draft  
**Date:** 2026-11-23  
**Status:** Draft for EMA sign-off (Phase 0)  
**Form:** ILUP for Drylands — **mobile module** `DrylandsForm.tsx` (`public/drylands-schema.json`, 58 questions)  
**Ingest paths:** Mobile API sync → `public/drylands-data.json` · legacy Excel via `import_drylands.py` · Supabase `ldn.drylands_observations`

---

## B.1 Scope and compliance role

Drylands observations support **drylands / ILUP programme** planning and evidence. They complement SO1 field validation (LDN/Soil) by capturing **ward-scale** degradation drivers, priorities, and **recommended interventions**.

| Role | Standards / programme link |
|------|----------------------------|
| Field evidence for drylands investments | GEF / national drylands programme (ILUP) |
| Land condition narrative | Supports SO1 **verification** and national expert QA (not a substitute for gridded LPD/LC) |
| Interventions list | Links to **Deliverable A** `intervention_record` and EMA **projects** spatial layers (Annex D) |
| Restoration / bright-spot storytelling | Feeds PRAIS narrative and counterbalancing discussions (GPG Addendum) |

**Canonical entity:** `drylands_observation` (see Project Guide §5.2).

---

## B.2 Ingestion rules (dual shapes)

| Source | Marker | Notes |
|--------|--------|-------|
| **Mobile submission** | JSON payload + `raw_data` cache | Checkbox fields → arrays or joined strings |
| **ILUP Excel** | `_source: "ilup_excel"` | Column positions fixed in `import_drylands.py` (§ B.4) |
| **Dashboard edits** | `drylands-modifications.json` | **Migrate** to audited DB (Phase 2) |
| **Supabase** | `drylands_observations` row | Partial columns today — full payload in `raw_data` |

**District inference (Excel only):** `infer_district()` uses ward-number heuristics for Chivi, Gutu, Chipinge, etc. — **must be replaced** with governed `admin_units` lookup in Phase 1.

**Live cache:** `public/drylands-data.json` — **16 records** at last export (mobile + legacy Excel rows). **Re-import:** `npm run import:drylands` (Excel in `data/imports/` or project root).

---

## B.3 Field map (mobile form field → canonical column)

| # | Mobile field `name` | Type | Canonical `drylands_observation.*` | Supabase (current) | Programme / SO link | Action |
|---|-------------|------|-----------------------------------|--------------------|---------------------|--------|
| 1 | `date_of_observation` | text/date | `observed_at` | — | Period tagging | **Extend** |
| 2 | `enumerator_name` | text | `enumerator` | `enumerator` | Audit | **Keep** |
| 3 | `ward_name` | text | `ward` | `ward` | Admin unit | **Keep** |
| 4 | `village_location` | text | `village_location` | — | Local context | **Extend** |
| 5 | `coordinates` | text / geopoint | `geometry`, `lat`, `lng` | `lat`, `lng` | Map / GIS | **Keep**; parse CSV lat/lng from Excel |
| 6 | `area_type` | checkbox | `area_types[]` | `area_type` (joined string) | Land use context | **Normalize** to array |
| 7 | `area_type_other` | text | `area_type_other` | — | — | **Extend** |
| 8 | `dominant_soil_type` | radio | `dominant_soil` | `dominant_soil` | SO1-3 context (local) | **Keep** |
| 9 | `dominant_soil_type_other` | text | `dominant_soil_other` | — | — | **Extend** |
| 10 | `distance_to_river` | number | `dist_river_m` | `dist_river_m` | Hydrology / pressure | **Keep** |
| 11 | `distance_to_wetland` | number | `dist_wetland_m` | `dist_wetland_m` | Wetland pressure | **Keep** |
| 12 | `distance_to_road` | number | `dist_road_m` | `dist_road_m` | Access / development | **Keep** |
| 13 | `vegetation_condition` | radio | `vegetation_condition` | `veg_cover` | Degradation QA | **Keep**; trim whitespace in ETL |
| 14 | `vegetation_description` | text | `vegetation_description` | — | Evidence | **Extend** |
| 15 | `estimated_vegetation_cover` | number | `vegetation_cover_pct` | — | SO1-2 narrative | **Extend** |
| 16 | `invasive_species_present` | radio | `invasive_present` | — | Link Annex C invasives | **Extend** |
| 17 | `invasive_species_name` | text | `invasive_species_name` | — | — | **Extend** |
| 18 | `current_land_cover_types` | checkbox | `land_cover_types[]` | — | SO1-1 local classes | **Map** → UNCCD 7-class table |
| 19 | `current_land_cover_other` | text | `land_cover_other` | — | — | **Extend** |
| 20 | `soil_erosion_present` | radio | `erosion_present` | — | SO1-2 | **Extend** |
| 21 | `type_of_erosion` | checkbox | `erosion_types[]` | — | — | **Extend** |
| 22 | `erosion_severity` | radio | `erosion_severity` | — | Hotspot context | **Harmonize** Low vs data “Mild” |
| 23 | `gully_dimensions` | text | `gully_dimensions` | — | Engineering | **Extend** |
| 24 | `erosion_expanding` | radio | `erosion_expanding` | — | Trend | **Extend** |
| 25 | `assets_threatened` | checkbox | `assets_threatened[]` | — | Risk | **Extend** |
| 26 | `assets_threatened_other` | text | `assets_threatened_other` | — | — | **Extend** |
| 27 | `water_sources_present` | checkbox | `water_sources[]` | — | SO2 / livelihoods | **Extend** |
| 28 | `water_sources_other` | text | `water_sources_other` | — | — | **Extend** |
| 29 | `water_quality_visual` | checkbox | `water_quality[]` | — | — | **Extend** |
| 30 | `evidence_of_siltation` | radio | `siltation_evidence` | — | — | **Extend** |
| 31 | `wetland_cultivation_observed` | radio | `wetland_cultivation` | — | Policy flag | **Extend** |
| 32 | `water_notes` | text | `water_notes` | — | — | **Extend** |
| 33 | `climate_change_indicators` | checkbox | `climate_indicators[]` | — | SO2 / drought | **Extend** |
| 34 | `climate_change_other` | text | `climate_other` | — | — | **Extend** |
| 35 | `site_flood_prone` | radio | `flood_prone` | — | — | **Extend** |
| 36 | `flood_notes` | text | `flood_notes` | — | — | **Extend** |
| 37 | `evidence_of_recent_fire` | radio | `fire_evidence` | — | LPD pressure | **Extend** |
| 38 | `fire_notes` | text | `fire_notes` | — | — | **Extend** |
| 39 | `signs_of_drought_stress` | radio | `drought_stress` | — | — | **Extend** |
| 40 | `drought_notes` | text | `drought_notes` | — | — | **Extend** |
| 41 | `dominant_livelihoods` | checkbox | `livelihoods[]` | — | SO4 / socio-economic | **Extend** |
| 42 | `livelihood_notes` | text | `livelihood_notes` | — | — | **Extend** |
| 43 | `grazing_pressure` | checkbox | `grazing_pressure[]` | — | SO1-2 pressure | **Extend** |
| 44 | `grazing_notes` | text | `grazing_notes` | — | — | **Extend** |
| 45 | `observed_land_use_conflicts` | checkbox | `land_use_conflicts[]` | — | Governance | **Extend** |
| 46 | `conflict_notes` | text | `conflict_notes` | — | — | **Extend** |
| 47 | `land_use_compatible` | radio | `ecologically_compatible` | — | — | **Extend** |
| 48 | `compatibility_explanation` | text | `compatibility_notes` | — | — | **Extend** |
| 49 | `priority_level` | radio | `priority` | `priority` | Programme ranking | **Keep** |
| 50 | `priority_explanation` | text | `priority_notes` | — | — | **Extend** |
| 51 | `recommended_interventions` | checkbox | `interventions[]` | `interventions` | Annex D link | **Keep** |
| 52 | `intervention_notes` | text | `intervention_notes` | — | — | **Extend** |
| 53 | `cost_category` | radio | `cost_category` | — | Planning | **Extend** |
| 54 | `cost_explanation` | text | `cost_notes` | — | — | **Extend** |
| 55–57 | `photo_1` … `photo_3` | file | `photo_urls[]` | in `raw_data` | Verification | **Keep** |
| 58 | `additional_notes` | text | `notes` | — | — | **Extend** |
| — | `submission_id`, `uuid` | system | `submission_id`, `uuid` | `kobo_id` (rename), `uuid` | Identity | **Keep** |
| — | — | — | `district`, `province` | `district` | Admin | **Derive** / Excel inference |
| — | — | — | `reporting_period`, `verification_status`, `data_tier` | — | Compliance | **Phase 1** |

---

## B.4 ILUP Excel column index (`import_drylands.py`)

Use when reconciling legacy Excel exports with mobile field names.

| Excel col | Maps to (record key) | Mobile field |
|-----------|-------------------|-----------------|
| 3 | `date_of_observation` | `date_of_observation` |
| 4 | `enumerator_name` | `enumerator_name` |
| 5 | `ward_name` (raw → `Ward N`) | `ward_name` |
| 6 | `village_location` | `village_location` |
| 7 | `coordinates` | `coordinates` |
| 12 | `area_type` | `area_type` |
| 21 | `dominant_soil_type` | `dominant_soil_type` |
| 25 | `distance_to_road_m` | `distance_to_road` |
| 26 | `vegetation_condition` | `vegetation_condition` |
| 28 | `estimated_vegetation_cover` | `estimated_vegetation_cover` |
| 29–30 | invasive fields | `invasive_species_*` |
| 31 | `current_land_cover` | `current_land_cover_types` |
| 39–48 | erosion block | `soil_erosion_*`, `erosion_*`, `assets_threatened` |
| 56–70 | water / wetland | `water_*`, `wetland_*` |
| 72–85 | climate / fire / drought | `climate_*`, `fire_*`, `drought_*` |
| 86–108 | livelihoods / conflicts / compatibility | §17–19 mobile form |
| 109–123 | priority, interventions, cost | §20–21 mobile form |
| 125,127,129 | `photo_urls` | `photo_*` |
| 130 | `notes` | `additional_notes` |
| 131–133 | `_id`, `_uuid`, `_submission_time` | Submission metadata |

---

## B.5 Observed value domains (n=16 cache)

| Field | Values (raw, trimmed in Phase 1) |
|-------|----------------------------------|
| `vegetation_condition` | Intact, Moderately Degraded, Severely Degraded, Deforested |
| `priority_level` | High (Immediate Action Required), Medium, Low |
| `dominant_soil_type` | Jecha (Sandy), Clay, Dark fertile alluvial, … |
| `erosion_severity` | **Severe**, **Mild** (3), **Moderate** — canonical **Low** per Annex F |

### B.5.1 Harmonization (v0.2)

| Raw in cache | Canonical (Annex F) | API behaviour |
|--------------|---------------------|---------------|
| `Mild` | `Low` | `GET /api/drylands` maps on read (`lib/normalize-field-values.ts`) |
| `Low` | `Low` | unchanged |
| `Moderate` | `Moderate` | trim whitespace |
| `Severe` | `Severe` | unchanged |

Mobile form options should use **Low / Moderate / Severe** only (no “Mild”).

---

## B.6 UNCCD land cover mapping (drylands checkboxes → 7-class)

| Drylands `current_land_cover_types` | Proposed UNCCD class |
|------------------------------------|----------------------|
| Woodland | Tree-covered |
| Cropland | Cropland |
| Grassland | Grassland |
| Bare Land | Other land |
| Settlement | Artificial |
| Wetland Vegetation | Wetland |

---

## B.7 EMA sign-off checklist (Annex B)

- [ ] Confirm Excel file location / naming (`ILUP_for_Drylands.xlsx` in repo root).  
- [ ] Approve ward → district inference or replace with official lookup.  
- [ ] Resolve **Mild** vs **Low** erosion severity.  
- [ ] Approve Supabase column expansion vs `raw_data`-only storage.  
- [ ] Link high-priority sites to intervention import (Annex D).

---

## Document control

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-11-23 | Initial annex from schema, import script, and live cache |
| 0.2 | 2026-11-23 | Mobile-only collection; removed external survey platform references |
| 0.3 | 2026-11-23 | Erosion Mild→Low; API normalize on read |