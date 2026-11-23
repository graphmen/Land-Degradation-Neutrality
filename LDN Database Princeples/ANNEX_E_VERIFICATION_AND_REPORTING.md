# Annex E — Verification workflow and reporting export (PRAIS readiness)

**Session:** 60-minute working draft  
**Date:** 2026-11-23  
**Status:** Draft v0.2 — operational checklist added  
**Operational checklist:** [`REPORTING_DESK_CHECKLIST.md`](./REPORTING_DESK_CHECKLIST.md) (Reporting desk module)  
**Standards:** GPG SDG 15.3.1 (v2 + 2025 Addendum), PRAIS 4 reporting manual, Project Guide §1.3, §13

---

## E.1 Purpose

Define how field data moves from **mobile submission** to **national reporting quality**, and what the national LDN database must **export** for UNCCD reporting (with Trends.Earth / national analytics as inputs).

This annex does **not** replace PRAIS screens — it defines **EMA’s internal** states, audit, and export packages that feed the reporting officer.

---

## E.2 Verification states (field operations layer)

| State code | Label | Who acts | Meaning |
|------------|-------|----------|---------|
| `draft` | Draft | Enumerator (mobile) | Local queue only; not on server |
| `submitted` | Submitted | System (on sync) | Received; passes schema validation |
| `district_review` | District review | District GIS / supervisor | QA: location, photos, completeness |
| `national_review` | National review | National reporting officer / GIS | Methodology and code-list compliance |
| `approved` | Approved | National reporting officer | May be used in national tables/maps |
| `locked` | Locked for reporting | National reporting officer | Immutable for reporting period |
| `rejected` | Rejected | Reviewer | Returned with reason; enumerator may resubmit new UUID |
| `superseded` | Superseded | System | Replaced by newer submission (linked `replaces_uuid`) |

**Rules (draft):**

1. Only `approved` or `locked` records appear in **official export** datasets.  
2. `locked` is required for the final PRAIS submission snapshot for a given `reporting_period`.  
3. Every transition writes `verification_log` (user, role, timestamp, from_state, to_state, comment).  
4. Mobile app shows read-only status; reviewers use **Verification workspace** (R1 — not legacy `/database`).

**Applies to:** `ldn_field_assessment`, `soil_sample_*`, `drylands_observation`, `intervention_record` (where field-captured).

---

## E.3 Review checklist by entity (minimum)

| Entity | District reviewer | National reviewer |
|--------|-------------------|-------------------|
| LDN | GPS accuracy; photo present; CEID valid; land cover plausible | UNCCD 7-class mapping; severity vs signs consistent |
| Soil | 0–30 cm depth; texture/moisture; CEID matches LDN point | Lab SOC linked when claimed; Tier-2 metadata |
| Drylands | Ward/village; priority justified | Intervention list codes; link to pressure layers if cited |
| Interventions | Location; funding/org text | SO4 narrative; counterbalancing evidence if used |

---

## E.4 Reporting period and data tier (required metadata)

| Field | Required on export | Notes |
|-------|-------------------|--------|
| `reporting_period` | Yes (when assigned) | e.g. `2016-2019`, `2020-2023` — national config |
| `baseline_period_id` | Yes for SO1 status | Default baseline end **2015** per workshop |
| `data_tier` | Yes | `tier1_default` \| `tier2_national` \| `tier3_research` \| `field_verify` |
| `form_version_id` | Yes | Mobile release that captured the record |
| `code_list_version` | Yes | `reference_code_lists.version` at submission |

---

## E.5 PRAIS-oriented export packages (Deliverable A)

Each export job produces a **folder** with data + **ISO-style metadata** (`metadata.xml` or `metadata.json`).

| Package ID | Contents | SO / use |
|------------|----------|----------|
| `EXP-SO1-FIELD` | CSV/GeoPackage: LDN + soil points (`locked` only) | Field evidence for SO1 QA narrative |
| `EXP-SO1-STATUS` | National status polygons or zonal stats + legend | SO1 degraded/stable/improved |
| `EXP-SO1-LC` | Land cover transitions table | SO1-1 |
| `EXP-SO1-LPD` | LPD class zonal summary | SO1-2 |
| `EXP-SO1-SOC` | SOC stock layers / Tier-2 sample table | SO1-3 |
| `EXP-META` | Custodian, vintage, methods, confidence | PRAIS supporting information |
| `EXP-PHOTOS` | Manifest of photo URLs + submission UUID | Verification evidence |

**Minimum columns — `EXP-SO1-FIELD` (LDN):**

`uuid`, `submission_id`, `collect_earth_id`, `reporting_period`, `verification_status`, `data_tier`, `lat`, `lng`, `accuracy_m`, `district`, `ward`, `measurement_date`, `unccd_land_cover_class`, `land_cover_national`, `land_use_type`, `degradation_severity`, `degradation_signs`, `vegetation_cover`, `matches_baseline_lc`, `verified_by`, `verified_at`, `form_version_id`, `code_list_version`

**Minimum columns — `EXP-SO1-FIELD` (Soil):**

`uuid`, `submission_id`, `parent_uuid`, `collect_earth_id`, `reporting_period`, `verification_status`, `data_tier`, `lat`, `lng`, `depth_cm`, `texture_class`, `moisture_condition`, `soc_percent`, `lab_number`, `sample_position`, `verified_at`

---

## E.6 Trends.Earth / national analytics handoff

| Step | Owner | Output |
|------|-------|--------|
| Import national default or ZW LPD/LC/SOC rasters | GIS | Registered in Annex C catalogue |
| Run national status workflow per GPG | Reporting officer | `EXP-SO1-STATUS` |
| Compare field package `EXP-SO1-FIELD` to hotspots | National expert | Workshop minutes + optional validator verdicts |
| Assemble PRAIS submission | Reporting officer | Upload per PRAIS 4 manual + attach `EXP-META` |

---

## E.7 Implementation phases (link to Work Plan)

| Phase | Deliverable |
|-------|-------------|
| Phase 1 | Add `verification_status`, `reporting_period`, `data_tier` to API (nullable, backward compatible) | ✅ app + `004` SQL (apply pending) · [`design/GOVERNANCE_API_P1.md`](./design/GOVERNANCE_API_P1.md) |
| Phase 2 | `verification_log` table; retire un-audited JSON edits for reporting entities |
| Phase 3 | District/national review UI + role-based transitions |
| Phase 4 | Export jobs `EXP-*` + dry-run checklist (WP5.1) |
| Phase 5 | Lock snapshot + gap report SO2–SO5 |

---

## E.8 EMA sign-off checklist

- [ ] Approve state machine (§E.2) and role assignments.  
- [ ] Approve reporting period definitions for Zimbabwe.  
- [ ] Approve minimum export column lists for Nov 2026 SO1 rehearsal.  
- [ ] Confirm locked snapshot procedure (who, when, rollback policy).

---

## Document control

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-11-23 | Initial verification + PRAIS export package draft |