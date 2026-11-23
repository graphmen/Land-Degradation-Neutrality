# Zimbabwe LDN National Platform — Project Development Guide

**Audience:** EMA technical teams, GIS/reporting officers, database administrators, and mobile field-app developers.  
**Status:** Draft v0.4 — for EMA steering review before implementation sprints.  
**Formats:** Markdown (source of truth in repo) + **Word** (`.docx`) for official circulation.  
**Companion:** [ZIMBABWE_LDN_WORK_PLAN.md](./ZIMBABWE_LDN_WORK_PLAN.md)  
**Aligned with:** UNCCD 2018–2030 Strategic Framework, SDG Indicator **15.3.1**, GPG Version 2 + **2025 Addendum**, Zimbabwe UNCCD Training & Validation Workshop (Sept 2026, Harare).

---

## 1. Purpose of this document

This guide defines how we will **restructure and extend** the existing EMA LDN dashboard and mobile tools **without discarding** current work. The goal is **global compliance** (UNCCD / SDG reporting readiness) while keeping what already works for EMA operations: field collection, maps, database explorer, and Kobo sync.

**We are not rebuilding from zero.** We are adding structure, metadata, validation workflows, and reporting layers on top of the current system.

---

## 1.1 North star — two major deliverables (EMA assignment)

At the end of this programme, EMA must have **two production-grade systems** that work together and meet UNCCD / SDG **15.3.1** expectations:

| Deliverable | Purpose | Global standard role |
|-------------|---------|----------------------|
| **A. National LDN database** | Authoritative store for field data, national layers, verification, audit, and reporting exports | Supports SO1 sub-indicators, period/status logic, metadata, PRAIS/Trends.Earth handoff |
| **B. LDN data collection tool** | Mobile (and optionally Kobo) capture with offline sync, GPS/photos, governed forms | Tier-2 field evidence; QA of hotspots/bright spots; traceable submissions |

**What we already have (foundation — not throwaway):**

| Existing asset | Maps to deliverable |
|--------------|---------------------|
| Next.js web application (`/ldn`, `/soil`, `/drylands`, `/database`, maps, sync) | **Database** operational UI + national visibility |
| Kobo Collect forms + sync (`download_ldn.py`, `/api/ldn`, `/api/soil`) | **Collection** channel + ingest pipeline |
| `public/*-data.json` + modifications JSON | Temporary reconciliation — **to migrate** into database tables |
| FastAPI + optional Supabase | **Database** technical backbone (to be formalized as system of record) |
| Mobile APK + field validator (offline maps, draft queue) | **Collection tool** core — align forms & sync to national schema |
| Drylands ILUP workbook / Kobo | Extension under same database + collection model |

**Definition of “done” for global standards (high level):**

1. Every field submission has **identity, time, location, form version, verification status, and reporting period** when assigned.
2. National DB separates **field operations** from **gridded SO1 analytics** from **reporting exports**.
3. Code lists align with **UNCCD land cover legend**, LPD classes, and SOC tiering (national extensions documented).
4. Workflows support **national expert verification** before data is locked for reporting.
5. Exports can support **PRAIS 4** and national narrative with evidence (maps, tables, metadata).

All implementation work should be scored against **Deliverable A** or **Deliverable B** (or the bridge between them). See phased roadmap in Section 8 and the detailed schedule in the **Work Plan**.

---

## 1.2 Standards, principles, and compliance (non‑negotiables)

Implementation must follow these principles. They apply to database design, APIs, mobile/Kobo, and national spatial layers (including datasets in `important files/`).

| Principle | What it means in practice |
|-----------|---------------------------|
| **UNCCD / SDG alignment** | Every reporting-related entity can be traced to SO1 (15.3.1) or documented national extensions (SO2–SO5). |
| **Period-aware data** | Records and rasters are tagged with **baseline vs reporting period**; status (degraded / stable / improved) is computed per GPG, not ad hoc map colours. |
| **Tiered evidence** | Tier 1 (defaults), Tier 2 (national field/lab), Tier 3 (research) explicit on SOC, LPD, and land cover. |
| **Separation of layers** | Field operations ≠ national gridded analytics ≠ PRAIS export packages (see §5.1). |
| **Verification before reporting** | Submissions flow through governed states; national officer locks data used in official tables. |
| **Single code-list source** | Kobo, mobile, database, and exports read the same `reference_code_lists` version. |
| **Metadata & lineage** | Imports (shapefiles, Excel, Trends.Earth) carry custodian, vintage, CRS, and confidence. |
| **Progressive enhancement** | No “big bang” replacement of the working dashboard, sync, or mobile app. |
| **Government accountability** | Audit trail on changes; soft-delete for field submissions; role-based access. |
| **Security** | No PRAIS credentials in client apps; secrets only on EMA-controlled infrastructure. |

**Authoritative references:** GPG v2 + 2025 Addendum (`GPG_Addendum.pdf` in this folder), PRAIS 4 manual, workshop slides, and **[ANNEX_A_FIELD_MAPPING.md](./ANNEX_A_FIELD_MAPPING.md)** for field-level compliance.

---

## 2. What the workshop requires (study summary)

### 2.1 National reporting goal (2026 cycle)

- Strengthen capacity for **high-quality national UNCCD reports** (SO1 due **November 2026**; SO2–SO5 due **February 2027**).
- Use **PRAIS 4**, **Trends.Earth**, default and national datasets, with **verification** by national experts.
- Align reporting with SDGs and related frameworks (e.g. KMGBF where relevant).

### 2.2 SDG 15.3.1 core logic

**Proportion of land that is degraded over total land area** is derived from **three sub-indicators** (Strategic Objective SO1):

| Sub-indicator | SO code | What it measures |
|---------------|---------|------------------|
| Trends in land cover | SO1-1 | Land cover change vs degradation/improvement (transition matrix) |
| Trends in land productivity | SO1-2 | Land productivity dynamics (LPD), not the same as crop yield |
| Trends in carbon stocks (SOC) | SO1-3 | Soil organic carbon stock change (typically 0–30 cm depth) |

**Combined** → SO1-4 / SDG **15.3.1**.

### 2.3 Time structure (critical for database design)

| Concept | Meaning |
|---------|---------|
| **Baseline period (t₀)** | Reference era (UNCCD: end of baseline **2015**; assessments relative to this) |
| **Reporting period** | Typically **4-year** windows after baseline |
| **Period assessment** | Change in the three sub-indicators during one period |
| **Status** | Land condition at end of period vs baseline: **degraded**, **stable**, or **improved** |
| **Counterbalancing (LDN)** | Within the same land type, net degradation may be offset by documented improvement (retrospective, spatially explicit — per GPG Addendum) |

Any national database must store **which period** and **which tier of data** each record supports — not only “a point on a map.”

### 2.4 Land cover (SO1-1) — data principles

1. Select **best available** land cover dataset (national preferred if validated; global default e.g. ESA CCI if not).
2. Use or harmonize to the **7-class UNCCD legend** (tree-covered, grassland, cropland, artificial, other land, wetland, water) — or justify national extensions.
3. Define a **transition matrix** (degradation / neutral / improvement).
4. Document **metadata**, legend harmonization across years, and **confidence**.

### 2.5 Land productivity (SO1-2)

- LPD reflects **ecosystem / NPP-related** productivity trends, not farm output alone.
- Common presentation: **5 classes** (increasing, stable, stable but stressed, moderate decline, declining).
- Workshop recommends a **16-year moving window** for consistent trend evaluation.
- Workflow: choose VI → satellite source → annual aggregation → **verify** national LPD layer before reporting.

### 2.6 Soil organic carbon (SO1-3)

- Metric: **SOC stock** (e.g. t/ha), standard depth **0–30 cm**; needs concentration, bulk density, fragments where applicable.
- **Tier 1**: global/default (UNCCD); **Tier 2**: national surveys/inventories; **Tier 3**: detailed modelling/monitoring.
- Field soil surveys (like EMA’s Kobo soil form) are **verification and Tier-2 inputs**, not a substitute for national SOC mapping alone.

### 2.7 Field observations vs national reporting layers

Workshop repeatedly asks: *Do hotspots and bright spots from analysis match national knowledge, policies, and **field observations**?*

Therefore the mobile app and validation database are **first-class citizens**: they support **QA/QC** and narrative confidence for PRAIS, not only operational monitoring.

### 2.8 Tools named in training (integration targets)

| Tool | Role |
|------|------|
| **PRAIS 4** | Official national report submission |
| **Trends.Earth** | SO1 gridded analysis, default packages, exports for PRAIS |
| **Kobo / field apps** | Ground truth, ward-level surveys, photos, GPS |
| **National GIS/DB** | Authoritative boundaries, land cover, interventions, drylands |

---

## 3. Current platform — what we keep

| Asset | Role today | Keep? |
|-------|------------|-------|
| Next.js dashboard (`/ldn`, `/soil`, `/drylands`, `/interventions`, `/database`) | Visualization, edits, export | **Yes** — evolve APIs & schema |
| Kobo sync + `public/*-data.json` | Operational cache | **Yes** — become *replica* of DB, not source of truth |
| FastAPI backend | Kobo proxy | **Yes** — extend with reporting-period logic |
| Mobile Capacitor app + validator | Offline navigation, field validation | **Yes** — align forms to canonical schema |
| `*-modifications.json` | Local reconciliation | **Migrate** to audited DB tables |
| Supabase (optional live source) | Remote telemetry | **Yes** — formalize as staging/production DB |
| Drylands Kobo form / ILUP Excel | Drylands programme | **Integrate** under unified metadata model |

**Principle:** *Progressive enhancement* — every sprint must leave the current dashboard usable.

---

## 4. Gap analysis (compliance vs current build)

| Requirement | Current state | Gap |
|-------------|---------------|-----|
| Baseline vs reporting period tagging | Mostly implicit | Need `reporting_period`, `baseline_id` on all spatial records |
| SO1-1 / SO1-2 / SO1-3 separation | LDN form mixes field LDN points; soil separate | Need logical model linking field plots to sub-indicator role |
| Transition matrix & 7-class LC | Custom landuse/severity on forms | Map enumerations → UNCCD legend + transitions |
| LPD integration | Not in app | Import/store national LPD rasters or zonal stats |
| SOC Tier tagging | Soil OC from lab Excel merge | Tag samples: depth, bulk density, lab tier, uncertainty |
| Status (degraded/stable/improved) | Hotspot/bright spot heuristics | Align with GPG status rules per period |
| Counterbalancing | Conceptual in UI only | Future module; store improvement/degradation polygons by land type |
| Verification workflow | Ad-hoc | States: draft → field verified → national approved → locked for reporting |
| Metadata (ISO-style) | Minimal | Dataset id, source, vintage, resolution, custodian, confidence |
| PRAIS / Trends.Earth export | Manual | Structured export jobs (GeoPackage/CSV + metadata sidecar) |
| Audit trail | JSON file edits | DB: who/when/what for government accountability |

---

## 5. Target information architecture

### 5.1 Layers (do not merge in one table)

```
┌─────────────────────────────────────────────────────────────┐
│  REPORTING & COMPLIANCE LAYER                               │
│  period_assessment, status_maps, counterbalancing, prais_   │
│  exports, narrative_evidence                                │
├─────────────────────────────────────────────────────────────┤
│  NATIONAL ANALYTICS LAYER (gridded / zonal)                 │
│  land_cover, lpd, soc_stock, degradation_mask (per period)  │
├─────────────────────────────────────────────────────────────┤
│  FIELD OPERATIONS LAYER                                     │
│  ldn_surveys, soil_samples, drylands_observations, photos,    │
│  gps_tracks, validator_verdicts                             │
├─────────────────────────────────────────────────────────────┤
│  REFERENCE & GOVERNANCE                                     │
│  admin_units, forms, code_lists, users/roles, audit_log     │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Canonical field entities (mobile + Kobo)

| Entity | Workshop link | Notes |
|--------|----------------|-------|
| `ldn_field_assessment` | SO1 field validation, hotspots | GPS, ward, landuse, severity, photos |
| `soil_sample_parent` / `soil_sample_point` | SO1-3 Tier 2 | Depth, texture, moisture, lab SOC, CEID |
| `drylands_observation` | ILUP / drylands programme | Priority, interventions, vegetation |
| `intervention_record` | Implementation framework | Links to bright-spot / restoration reporting |

Each record must include:

- `uuid`, `kobo_submission_id` (if applicable)
- `collected_at`, `enumerator_id`, `device_id`
- `geometry` (Point/Polygon), accuracy
- `reporting_period` (nullable until national assignment)
- `verification_status`, `verified_by`, `verified_at`
- `data_tier` (tier1_default | tier2_national | tier3_research | field_verify)

### 5.3 Code lists (governance)

Maintain versioned code lists (DB table + JSON export for Kobo):

- UNCCD land cover 7 classes (+ Zimbabwe national subclasses)
- LPD 5 classes
- Degradation / improvement / neutral transitions
- UNCCD-aligned severity and intervention types

**Never hard-code** in UI only — single source in `reference_code_lists`.

---

## 6. Mobile application — development principles

1. **One national app**, modules: LDN survey, Soil, Drylands (existing forms), Validator (hotspot/bright-spot QA).
2. **Offline-first** with encrypted local queue; sync when connectivity allows (already partially implemented).
3. **Form versions** pinned to `form_version_id`; submissions immutable after upload (corrections = new submission + link).
4. **Mandatory GPS quality** rules (accuracy threshold, stale warning).
5. **Photo evidence** linked to submission UUID (already partially in export sanitization).
6. **No PRAIS keys or secrets** in the app — only EMA-approved API endpoints.
7. Field app supports **validation missions** explicitly: “confirm / reject / adjust” national model pixel or polygon.

---

## 7. Database — development principles

1. **PostgreSQL / PostGIS** as system of record (Supabase or EMA-hosted — decision required).
2. **JSON files** remain as read replicas for Vercel/edge fallback only (`OFFLINE_MODE`).
3. All writes go through API with **role-based access** (enumerator, district reviewer, national reporting officer, admin).
4. **Migrations** versioned in `backend/migrations/` or Supabase SQL.
5. **Sync pipeline:** Kobo webhook or scheduled pull → staging → validation rules → production tables → refresh `public/*.json`.
6. **Retention:** align with government records policy; soft-delete + audit, no hard-delete of submitted field data.

---

## 8. Phased roadmap (recommended)

> **Detailed tasks, RACI, risks, and session plan:** [ZIMBABWE_LDN_WORK_PLAN.md](./ZIMBABWE_LDN_WORK_PLAN.md)

### Phase 0 — Alignment & governance (2–3 weeks)

- [ ] EMA steering group approves this guide (Word + Markdown)
- [ ] Appoint **national reporting officer** role in system
- [ ] Inventory all Kobo forms + Excel (drylands ILUP) + lab SOC spreadsheet
- [x] Map form fields → canonical entities — **LDN + Soil draft** in Annex A
- [ ] Register EMA national spatial datasets — see §13 and [`important files/README.md`](../important%20files/README.md)

### Phase 1 — Reference data & metadata (3–4 weeks)

- [ ] Code lists + transition matrix (Zimbabwe national, documented deviations from default UNCCD)
- [ ] Add `reporting_period`, `verification_status`, `data_tier` to API models (backward compatible)
- [ ] Document baseline/period definitions for Zimbabwe in config

### Phase 2 — Database hardening (4–6 weeks)

- [ ] Consolidate Supabase schema (or Postgres) for field + reference layers
- [ ] Replace `*-modifications.json` with audited tables + migration script
- [ ] Kobo sync writes to DB first, then JSON cache

### Phase 3 — Mobile alignment (4–6 weeks)

- [ ] Regenerate XLSForms from canonical schema
- [ ] Validator links field verdicts to national grid cells / survey IDs
- [ ] QA test: offline sync, conflict resolution, government sign-off workflow

### Phase 4 — Analytics & reporting bridge (6–8 weeks)

- [ ] Import national LPD / land cover / SOC layers (or Trends.Earth exports)
- [ ] Status map generation per GPG (degraded/stable/improved)
- [ ] PRAIS-oriented export packages + evidence attachments
- [ ] Counterbalancing pilot (one land type, one region)

### Phase 5 — 2026 reporting dry run

- [ ] Full SO1 rehearsal submission checklist
- [ ] Gap report for SO2–SO4 indicators

---

## 9. Immediate next steps (this week)

1. **Review meeting:** Walk through Sections 2–4 with EMA GIS and reporting leads.
2. **Field mapping workshop:** One session per form (LDN, Soil, Drylands) — fill annex template below.
3. **Drylands Excel:** Place / confirm `ILUP_for_Drylands_Project_*.xlsx` in repo or `data/imports/`; run import spec (separate task).
4. **Do not** change production Kobo forms until Phase 1 code lists are signed off.

---

## 10. Programme annexes (field + spatial + interventions)

Master index: **[ANNEX_INDEX.md](./ANNEX_INDEX.md)** · Commit after each session: **[REPOSITORY_WORKFLOW.md](./REPOSITORY_WORKFLOW.md)**

| Annex | Title | File | Status |
|-------|-------|------|--------|
| A | LDN + Soil field mapping | [ANNEX_A_FIELD_MAPPING.md](./ANNEX_A_FIELD_MAPPING.md) | v0.2 draft |
| B | ILUP Drylands field mapping | [ANNEX_B_DRYLANDS_FIELD_MAPPING.md](./ANNEX_B_DRYLANDS_FIELD_MAPPING.md) | v0.1 draft |
| C | National spatial layers register | [ANNEX_C_SPATIAL_LAYERS_REGISTER.md](./ANNEX_C_SPATIAL_LAYERS_REGISTER.md) | v0.1 draft |
| D | Interventions / restoration register | [ANNEX_D_INTERVENTIONS_REGISTER.md](./ANNEX_D_INTERVENTIONS_REGISTER.md) | v0.1 draft |

**Annex A summary (steering):** LDN + Soil Kobo → `ldn_validations` / `soil_samples`; SO1-1/2/3 links; ETL blockers documented in §A.1.

**Annex B–D (this wave):** Drylands 58-question ILUP map; EMA LDN polygons (`Stable` / `Improved` / `Degraded`); interventions path from demo JSON → EMA `projects.zip`.

**Next annex (future):** Verification workflow + PRAIS export field list (Annex E).

---

## 11. Key official references

- GPG SDG 15.3.1 Version 2 + **2025 Addendum** (in this folder: `GPG_Addendum.pdf`)
- UNCCD reporting manual (PRAIS4): https://prais4-reporting-manual.unccd.int/
- Trends.Earth: https://data.trends.earth
- Workshop slides: `DAY1_Zim (2).pptx`, `Zim Day 2 and 3.pptx`, `Zim Day 4.pptx`

---

## 12. EMA national spatial assets (`important files/`) — summary

Full attribute dictionary and ingest metadata: **[ANNEX_C_SPATIAL_LAYERS_REGISTER.md](./ANNEX_C_SPATIAL_LAYERS_REGISTER.md)**.  
Folder register: [`important files/README.md`](../important%20files/README.md).

| Asset | Role in national LDN database |
|-------|-------------------------------|
| **Combined LDN shapefiles** | National validation / reporting units for overlay with field points (Collect Earth IDs) |
| **Existing sites** (XLS) | Reference monitoring and training locations (district, name, lat/lon) |
| **EMA projects** | Restoration / intervention spatial evidence |
| **SBC** (soil & water conservation) | Conservation interventions layer |
| **Invasive species** | Degradation pressure / driver context (SO1-2 narrative) |
| **Illegal mining (gold/chrome panning)** | Pressure layer; sensitivity — restrict by role |

Ingestion must follow §1.2 (metadata, versioning, layer separation). Work Plan **WP-GEO** and **WP4.1** schedule PostGIS load and map integration.

---

## 13. Compliance & quality checklist (release gates)

Use before marking a phase complete or exporting data for PRAIS rehearsal.

| Area | Check |
|------|--------|
| **Schema** | Field entities match Annexes A + B; spatial Annex C signed by GIS |
| **Periods** | `reporting_period` and baseline documented in config |
| **Land cover** | National classes map to UNCCD 7-class or approved exception on record |
| **SOC** | Depth 0–30 cm for Tier 2 soil samples; lab linkage via CEID where claimed |
| **Verification** | Only `approved` / `locked` rows in official export sets |
| **Spatial imports** | Each layer in catalogue with CRS, source, vintage |
| **Code lists** | Form version tied to `reference_code_lists` version |
| **Audit** | User, timestamp, and action logged for production edits |
| **Replica files** | `public/*.json` regenerated from DB, not hand-edited for reporting |

---

## 14. Work plan and documentation set

| Document | Audience | Word output |
|----------|----------|-------------|
| This **Project Development Guide** | Steering, GIS, reporting, dev | `ZIMBABWE_LDN_PROJECT_GUIDE.docx` |
| **Work Plan** | Programme management, donors, ICT | `ZIMBABWE_LDN_WORK_PLAN.docx` |
| **Annex A** — field mapping | Field + database teams | Include in guide pack or separate PDF |
| **`important files/README`** | GIS | Part of data governance pack |

Delivery is iterative: **~60-minute working sessions** produce annexes and specs; **2-week sprints** ship software increments. Both rhythms are defined in the Work Plan §3.3 and §9.

---

## 15. Document control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-11-23 | EMA / LDN project team (draft) | Initial synthesis from workshop materials + current OAU codebase |
| 0.2 | 2026-11-23 | EMA / LDN project team (draft) | Annex A field mapping completed (see `ANNEX_A_FIELD_MAPPING.md`) |
| 0.3 | 2026-11-23 | EMA / LDN project team (draft) | Compliance principles, EMA spatial annex, work plan, Word editions |
| 0.4 | 2026-11-23 | EMA / LDN project team (draft) | Annexes B–D, annex index, repository workflow |

**Approval signatures:** *(pending)*  
National Reporting Officer: _______________  
EMA ICT / Database: _______________  
LDN Programme Lead: _______________