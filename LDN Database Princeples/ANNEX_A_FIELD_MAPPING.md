# Annex A — Mobile form field → national database → SO mapping

**Session:** 60-minute working draft (LDN + Soil modules)  
**Date:** 2026-11-23  
**Status:** Draft for EMA workshop sign-off (Phase 0)  
**Collection channel:** EMA national mobile app (**Android + iOS** only) — see Project Guide §1.2.

| Module | Mobile UI | Canonical schema reference | API / storage |
|--------|-----------|----------------------------|---------------|
| LDN validation | `mobile/src/components/LdnForm.tsx` | `public/ldn-schema.json` (field catalogue) | `POST` mobile sync → `ldn_validations` |
| Soil sampling | `mobile/src/components/SoilForm.tsx` | `public/soil-schema.json` | `soil_samples` (one row per core) |

**Reference:** [ZIMBABWE_LDN_PROJECT_GUIDE.md](./ZIMBABWE_LDN_PROJECT_GUIDE.md) Sections 2, 5, and phased roadmap.

---

## A.1 Ingestion rules (dual JSON shapes)

The dashboard and sync pipeline must treat **one logical record** whether it arrives from a **mobile submission payload** or a Supabase-shaped cache row. Legacy caches may use older key names (`geninfo/*`, `sampl/*`); new mobile uploads should use canonical names in Annex tables.

| Layer | LDN (`public/ldn-data.json`) | Soil (`public/soil-data.json`) |
|-------|------------------------------|--------------------------------|
| **Mobile payload / legacy cache** | Flat or grouped keys (`landcov`, `dist`, … or legacy `poidet/landcov`) | Parent + sample points (`depth_cm`, `texture`, …) |
| **API `normalise()`** | Copies last path segment → short alias (`landcov`, `dist`, …) in `app/api/ldn/route.ts` | Same pattern in `app/api/soil/route.ts` |
| **Supabase table** | `ldn.ldn_validations` | `ldn.soil_samples` |
| **Cache row (current)** | Top-level columns often **empty**; values live in `raw_data` only (re-run mapping on sync) | One row **per repeat** sample; denormalized columns populated |

**Canonical read order (LDN):**

1. `raw_data['poidet/landcov']` (etc.)  
2. Else top-level after normalise (`landcov`)  
3. Else legacy Supabase column (`land_cover`)  

**Canonical read order (Soil):** top-level `depth_cm`, `texture`, … then `raw_data['sampl/dep']`, etc. (`scripts/repopulate-supabase.js`).

**Action (Phase 1):** ~~Fix ETL~~ **Done:** `scripts/ldn-record-mapper.js` + `scripts/flatten_ldn_cache.js`; sync runs flatten after download. Cache now **150/150** with `land_cover` / `land_use` at top level.

**Known defect:** `repopulate-supabase.js` maps `land_use` from `raw['ldi/tree']` when `poidet/landus` is missing — remove that fallback (tree-loss causes are not land use).

---

## A.2 UNCCD land cover (SO1-1) — Zimbabwe mobile list → 7-class

GPG / PRAIS reporting uses the standard **seven land-cover classes**. Zimbabwe’s **mobile LDN land-cover options** are a **national subclass** set; retain both in the database.

| Mobile field `landcov` (n≈150 historical) | Proposed `unccd_land_cover_class` | National subclass retained | Notes |
|------------------------------|-----------------------------------|----------------------------|--------|
| Cropland | Cropland | `Cropland` | Direct |
| Tree/Forest | Tree-covered | `Tree/Forest` | Natural forest |
| Bush/Shrub | Tree-covered *or* Grassland | `Bush/Shrub` | **EMA decision:** map to Tree-covered if canopy >40%, else Grassland (field guide TBD) |
| Grassland | Grassland | `Grassland` | Direct |
| Plantation | Tree-covered | `Plantation` | Tagged `plantation=true` in metadata |
| baresoil | Other land | `baresoil` | Not Water; may indicate degradation hotspot context |
| *(not in current data)* Wetland | Wetland | — | Add to mobile form if wetlands validated |
| *(not in current data)* Artificial | Artificial land | — | Use `landus=Settlement` + future class |
| *(not in current data)* Water bodies | Water | — | From CE / national layer if needed |

| Mobile field `landus` | Role | SO link | Canonical column |
|---------------------|------|---------|------------------|
| Agriculture | Management / pressure context | SO1-1 (interpretation), field verify | `ldn_field_assessment.land_use_type` |
| Grazing | Same | SO1-2 context | `ldn_field_assessment.land_use_type` |
| Forestry | Same | SO1-1 | `ldn_field_assessment.land_use_type` |
| cons | Conservation / protected use | Field verify | `ldn_field_assessment.land_use_type` |
| Settlement | Settlement pressure | SO1-1 → often Artificial transition | `ldn_field_assessment.land_use_type` |
| Other + `use_spec` | Free text | Governance | `land_use_other` |

---

## A.3 LDN form — full field map (`ldn_field_assessment`)

Mobile LDN form sections: **General info** → **Point details** → **Land degradation indicators** → photos.

| Mobile field | Type | Canonical entity.column | Current Supabase `ldn_validations` | SO / reporting link | UNCCD / code list | Action |
|-------------------|------|-------------------------|-------------------------------------|---------------------|-------------------|--------|
| `start` | metadata | `collected_at` (derive) | — | Audit | — | **Map** from `_submission_time` |
| `end` | metadata | `form_duration` | — | QA | — | **Extend** (optional) |
| `today` | date | — | — | — | — | **Drop** (use measurement_date) |
| `deviceid` | metadata | `device_id` | — | Audit | — | **Keep** |
| `geninfo/measurement_date` | date | `measurement_date` | — (add column) | Period assignment | Baseline vs reporting period | **Extend** DB |
| `geninfo/dist` | select_one | `district` | `district` | Admin unit | ZW districts list | **Keep**; link `admin_units` |
| `geninfo/ward` | text | `ward` | `ward` | Admin unit | Ward gazette | **Keep** |
| `geninfo/Team` | text | `team_id` | `team` | Operations | — | **Keep** |
| `geninfo/GPS` | geopoint | `geometry`, `lat`, `lng`, `altitude`, `accuracy` | `lat`, `lng`, `altitude`, `accuracy` | SO1 field locate | GPG GPS QA | **Keep**; enforce accuracy rules |
| `geninfo/ceid` | text | `collect_earth_id` | `ceid` | Links CE / validator | Collect Earth ID | **Keep**; FK to national grid |
| — | — | `province` | `province` | Admin | — | **Derive** from district lookup (not on form) |
| `poidet/landcov` | select_one | `land_cover_national`, `unccd_land_cover_class` | `land_cover` | **SO1-1** field tier | § A.2 table | **Map** + code list version |
| `poidet/landus` | select_one | `land_use_type` | `land_use` | SO1-1 context | National land use | **Map** (fix ETL bug) |
| `poidet/use_spec` | text | `land_use_other` | — | Governance | — | **Extend** |
| `poidet/lndmat` | select_one | `matches_baseline_lc` | `matches_baseline` | SO1-1 verify vs CE | yes / no / part | **Keep** |
| `poidet/ex_mism` | text | `baseline_mismatch_note` | — | Field verify | — | **Extend** |
| `veg_cov` | select_one | `vegetation_cover_qualitative` | `veg_cover` | **SO1-2** field proxy | high / med / low | **Map** to LPD field vocabulary |
| `ldi/signs_ero` | select_multiple | `degradation_signs[]` | `erosion_signs` (string) | **SO1-2** / hotspot | See § A.5 | **Normalize** to array in DB |
| `ldi/tree` | select_multiple | `tree_loss_causes[]` | — | SO1-2 / deforestation | See § A.5 | **Extend** column |
| `ldi/sev` | select_one | `degradation_severity` | `severity` | Field verify / hotspot | non, sli, mod, sev | **Map** labels + GPG status rules |
| `oth` | text | `observations` | — | Evidence | — | **Extend** |
| `im` | image | `photo_attachment_ids[]` | in `raw_data._attachments` | Verification | — | **Keep**; store in blob + URL |
| `_uuid` | system | `uuid` | `uuid` | Identity | — | **Keep** |
| `submission_id` | system | `submission_id` | `kobo_id` (rename Phase 2) | Identity | — | **Keep** |
| `_submission_time` | system | `submitted_at` | `submission_time` | Audit | — | **Keep** |
| `validation_status` | system | `client_validation_status` | — | QA | — | **Keep** |
| `meta/*` | system | — | in `raw_data` | — | — | **Archive** only |

**Derived reporting fields (not on form — compute in Phase 1):**

| Canonical column | Rule (draft) | SO link |
|------------------|--------------|---------|
| `reporting_period` | Assigned by national officer | All SO1 |
| `verification_status` | Default `submitted`; workflow `verified` / `rejected` | Field verify |
| `data_tier` | Default `field_verify` for this form | GPG tiers |
| `field_status_vs_model` | Validator app: confirm / reject / adjust pixel | SO1-4 narrative |
| `is_hotspot_candidate` | `sev` ∈ {mod, sev} OR signs exclude `non` | Workshop QA |
| `is_bright_spot_candidate` | `sev=non` AND `veg_cov=high` AND no degradation signs | Workshop QA |

---

## A.4 Soil form — full field map (`soil_sample_parent` / `soil_sample_point`)

Soil mobile module supports **multiple cores per plot**. Each core → one `soil_sample_point`; visit → one `soil_sample_parent`.

| Mobile field | Type | Canonical entity.column | Current Supabase `soil_samples` | SO / reporting link | UNCCD / code list | Action |
|-------------------|------|-------------------------|----------------------------------|---------------------|-------------------|--------|
| `geninfo/measurement_date` | date | `parent.measured_at` | via `submission_time` | SO1-3 period | Sampling date | **Map** explicitly |
| `geninfo/dist` | select_one | `parent.district` | `district` | Admin | Districts | **Keep** |
| `geninfo/ward` | text | `parent.ward` | `ward` | Admin | — | **Keep** |
| `geninfo/Team` | text | `parent.team_id` | `team` | Operations | — | **Keep** |
| `geninfo/ceid` | text | `parent.collect_earth_id` | `ceid` | **Join to LDN** | Same CEID | **Keep**; FK |
| `sampl/samloc` | select_one | `point.sample_position` | `sample_position` | SO1-3 design | cent/north/south/east/west | **Keep** |
| `sampl/poin` | geopoint | `point.geometry`, lat/lng/accuracy | `lat`, `lng` | SO1-3 locate | 0–30 cm core location | **Keep** |
| `sampl/dep` | integer | `point.depth_cm` | `depth_cm` | **SO1-3** | Default 30 (GPG) | **Keep**; validate =30 for Tier 2 |
| `sampl/moisture` | select_one | `point.moisture_condition` | `moisture` | SO1-3 lab QA | Dry/Moist/Wet/Yes/No | **Map** (clarify labels vs field moisture) |
| `sampl/col` | text | `point.munsell_color` | `munsell_color` | Tier 2 evidence | Munsell RGB | **Keep** |
| `sampl/tex` | select_one | `point.texture_class` | `texture` | **SO1-3** bulk density / SOC pedotransfer | See § A.6 | **Map** to USDA texture |
| `sampl/samplecoll` | select_one | `point.sample_collected` | `sample_collected` | QC | Yes/No | **Keep** (missing from schema JSON export) |
| *(ETL merge)* `sampl/organic_carbon` | decimal | `point.soc_percent` | — (in raw after merge) | **SO1-3** | Lab SOC % | **Extend** Supabase column |
| *(ETL merge)* `sampl/lab_number` | text | `point.lab_number` | — | Traceability | EMA lab | **Extend** |
| *(ETL merge)* `sampl/sample_ref` | text | `point.lab_sample_ref` | — | Traceability | Excel crosswalk | **Extend** |
| `submission_id` | system | `point.submission_id` + sample index | `kobo_id` (rename Phase 2) | Identity | — | **Keep** |
| `_uuid` | system | `point.uuid` | `uuid` | Identity | — | **Keep** |
| Parent keys | — | `parent.submission_id` | `parent_kobo_id` (rename Phase 2) | — | — | **Keep** |

**SO1-3 linkage:** Join `soil_sample_parent.collect_earth_id` = `ldn_field_assessment.collect_earth_id` for same validation point. SOC stock change uses national gridded SO1-3 + these Tier-2 samples as calibration / verification.

---

## A.5 Code lists — observed values (from `public/*-data.json`, Nov 2026)

### LDN `ldi/sev` → display label

| Field code | Count | Display | Hotspot heuristic (dashboard) |
|-----------|-------|---------|-------------------------------|
| `mod` | 64 | Moderate | Hotspot candidate |
| `sli` | 40 | Slight | Neutral |
| `non` | 40 | None / no degradation | Bright-spot candidate |
| `sev` | 6 | Severe | Hotspot |

Some historical caches use `mod` / `sli` / `non` / `sev`; the app UI uses `High` / `Moderate` / `Low` / `None`. **Action:** single governed code list in the Android/iOS app.

### LDN `ldi/signs_ero` (space-separated in export)

| Code | Count (tokens) | Meaning (draft label) |
|------|----------------|------------------------|
| `non` | 59 | No visible degradation |
| `trecut` | 46 | Tree cutting / deforestation |
| `soil_ero` | 23 | Soil erosion |
| `barep` | 21 | Bare patches |
| `invas` | 15 | Invasive species |
| `fid` | 3 | *(confirm with form definition)* |

Mobile app lists additional values (`gully`, `wind`, `overgraz`, `salin`, `mining`) — harmonize on next form version.

### LDN `ldi/tree` (when `trecut` selected)

| Code | Count |
|------|-------|
| `firewood_harvesting` | 32 |
| `Agriculture` | 12 |
| `timber` | 7 |
| `charc` | 2 |
| `settlement` | 2 |

### LDN `ldi/veg_cov`

| Code | Count |
|------|-------|
| `high` | 29 |
| `med` | 95 |
| `low` | 25 |

### Soil `sampl/samloc`

| Code | Count | Meaning |
|------|-------|---------|
| `cent` | 146 | Center plot |
| `north` | 120 | Offset north |
| `east` | 115 | Offset east |
| `south` | 98 | Offset south |
| `west` | 87 | Offset west |

### Soil `sampl/moisture`

| Value | Count |
|-------|-------|
| Dry | 372 |
| Moist | 93 |
| No | 77 |
| Yes | 16 |
| Wet | 5 |

**EMA action:** Confirm form intent (field moisture vs “sample analyzed” yes/no).

### Soil `sampl/tex` → USDA (draft)

| Field code | Count | USDA class (draft) |
|-----------|-------|-------------------|
| `sanlo` | 285 | Sandy loam |
| `cllo` | 129 | Clay loam |
| `sand` | 111 | Sand |
| `clay` | 40 | Clay |

---

## A.6 Alignment gaps (app vs database vs dashboard)

| Topic | Database / legacy cache | Mobile app (target) | Action |
|-------|-------------|------------|--------|
| Land cover labels | Tree/Forest, Bush/Shrub, … | Forest Land, Cropland, … (6 classes) | Regenerate mobile from governed list after EMA sign-off |
| Severity | `mod`, `sli`, `non`, `sev` | High, Moderate, Low, None | **Map table** in `reference_code_lists` |
| Degradation signs | `soil_ero`, `barep`, `invas`, … | `gully`, `wind`, … | Merge lists; deprecate orphans |
| LDN Supabase columns | Empty in JSON cache | — | Fix sync ETL |
| `land_use` ETL | — | — | Remove `ldi/tree` fallback in `repopulate-supabase.js` |

---

## A.7 EMA workshop sign-off checklist (Phase 0)

- [ ] Approve UNCCD 7-class mapping for national subclasses (especially **Bush/Shrub**).
- [ ] Approve severity codes and hotspot / bright-spot rules vs GPG **degraded / stable / improved** (do not conflate with national status maps yet).
- [ ] Approve soil texture and moisture code lists for SOC Tier 2.
- [ ] Confirm `ceid` as mandatory join key between LDN and Soil.
- [ ] Authorize mobile form releases (Phase 3) vs code-list-only Phase 1.
- [ ] Assign owner for `reference_code_lists` table and version numbering.

---

## Document control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.2 | 2026-11-23 | LDN project team (draft) | Completed LDN + Soil Annex A from schemas and live JSON (n=150 LDN, n≈632 soil rows) |
| 0.3 | 2026-11-23 | LDN project team (draft) | Mobile-only collection channel; removed external survey platform references |

**Approval signatures:** *(pending)*  
National Reporting Officer: _______________  
EMA ICT / Database: _______________  
LDN Programme Lead: _______________