# Reporting desk — SO1 rehearsal checklist (Nov 2026)

**Audience:** National reporting officer · **Module:** R1 Reporting desk  
**Standards:** PRAIS 4 SO1 manual, GPG SDG 15.3.1 v2 + 2025 Addendum  
**Annex:** [E — Verification & reporting](./ANNEX_E_VERIFICATION_AND_REPORTING.md)

Use this at **national overview / reporting desk** — not as a dashboard widget. Tick when evidence exists in the **national corpus**, not when a JSON file “looks fine.”

---

## A. Governance (before numbers)

| # | Item | Evidence location | ☐ |
|---|------|-------------------|---|
| A1 | Reporting officer appointed (Work Plan RACI) | Steering minutes | |
| A2 | `reporting_period` defined for 2026 cycle | Signed config (Annex E §E.4) | |
| A3 | Code list v1.0 steering sign-off | Annex F + DB `reference_code_lists` | |
| A4 | Twinning / methodology notes (optional) | [`STEERING_PEER_TWINNING_RECOMMENDATION.md`](./STEERING_PEER_TWINNING_RECOMMENDATION.md) | |

---

## B. National corpus ready (Deliverable A)

| # | Layer | Register row | Gate | ☐ |
|---|-------|--------------|------|---|
| B1 | Combined LDN units (254k) | LDN-NAT-ALL | EMA Q1 Area unit + Q2 CEID join answered | |
| B2 | Field LDN (locked count ≥ policy min) | FIELD-LDN | Verification workspace | |
| B3 | Soil Tier-2 samples (locked) | FIELD-SOIL | Lab SOC linkage where claimed | |
| B4 | Drylands ILUP (if cited in SO1 narrative) | FIELD-DRY | Annex B codes | |
| B5 | EMA projects / SBC (if bright spots) | INT-* | [`CORPUS_METADATA_REGISTER.md`](./corpus/CORPUS_METADATA_REGISTER.md) | |
| B6 | Pressure layers (if drivers narrative) | PRESS-* | `003` applied + import plans | |
| B7 | Monitoring sites register | REF-SITES | `reference-monitoring-sites.json` | |

---

## C. PRAIS SO1 tables — data source map

| PRAIS focus | Sub-indicator | National source (target) | Export package | ☐ |
|-------------|---------------|--------------------------|----------------|---|
| Land cover extent | SO1-1 | National LC + transitions | `EXP-SO1-LC` | |
| Land productivity | SO1-2 | LPD national or validated default | `EXP-SO1-LPD` | |
| Soil organic carbon | SO1-3 | SOC surface + soil cores Tier 2 | `EXP-SO1-SOC` | |
| Proportion degraded | SO1-4 / 15.3.1 | 1OAO on three sub-indicators | `EXP-SO1-STATUS` | |
| Field QA narrative | Supporting | Locked field registry | `EXP-SO1-FIELD` | |
| Metadata | Annex II | Dataset register + methods | `EXP-META` | |

**Rule:** If national data replaces PRAIS default, complete PRAIS **metadata form** fields (title, source, author, citation) per Annex II.

---

## D. Method checklist (GPG)

| # | Requirement | Zimbabwe artefact | ☐ |
|---|-------------|-------------------|---|
| D1 | Baseline period end **2015** tagged | `baseline_period_id` on exports | |
| D2 | **1OAO** applied for SO1-4 | Documented in `EXP-SO1-STATUS` methods | |
| D3 | 7-class LC legend or documented harmonization | Annex A + code lists | |
| D4 | Transition matrix (degradation / neutral / improvement) | GIS / reporting officer doc | |
| D5 | Tier 1 / 2 / 3 labelled on every dataset | `data_tier` column | |
| D6 | Confidence level stated (high / medium / low) | `EXP-META` + steering | |

---

## E. Verification gate (internal — before PRAIS upload)

| # | Check | SQL / query concept | ☐ |
|---|-------|---------------------|---|
| E1 | No `submitted` records in export folders | `verification_status = locked` only | |
| E2 | `verification_log` complete for all locked rows | Audit sample 10 UUIDs | |
| E3 | `code_list_version` on every locked field row | Mobile + API | |
| E4 | Photos manifest matches locked UUIDs | `EXP-PHOTOS` | |
| E5 | Counterbalancing polygons (if used) registered | Reporting layer (future) | |

---

## F. Export job dry-run (Phase 4)

Run in order; store output under `exports/{reporting_period}/` (gitignored; EMA backup).

| Step | Job | Pass criteria | ☐ |
|------|-----|---------------|---|
| F1 | `EXP-META` | All corpus rows have custodian + vintage | ✅ `GET /api/export/meta` · 10 layers |
| F2 | `EXP-SO1-FIELD` | Column list = Annex E §E.5 | ✅ dry-run [`reporting-desk-dry-run.json`](../public/reporting-desk-dry-run.json) |
| F3 | `EXP-SO1-LC` | km² totals reconcile with GIS | 🔶 7×7 template only · `GET /api/export/so1-lc` |
| F4 | `EXP-SO1-LPD` | Classes match national LPD legend | 🔶 template · `GET /api/export/so1-lpd` |
| F5 | `EXP-SO1-SOC` | Depth 0–30 cm documented | 🔶 632 Tier-2 rows · `GET /api/export/so1-soc` |
| F6 | `EXP-SO1-STATUS` | % degraded matches 1OAO logic | 🔶 LD zonal **8.86%** degraded (not 1OAO) · [`EXP_SO1_STATUS.md`](./design/EXP_SO1_STATUS.md) |
| F7 | Package hash logged | Reporting desk handoff log | ✅ `npx tsx scripts/export_reporting_bundle.ts` · manifest in `exports/` |

---

## G. PRAIS upload & post-upload

| # | Action | Due (national) | ☐ |
|---|--------|----------------|---|
| G1 | SO1 tables entered or accepted in PRAIS 4 | **November 2026** | |
| G2 | Geospatial uploads (if national LC used) | With SO1 | |
| G3 | Supporting docs attached (`EXP-META`, narrative) | With SO1 | |
| G4 | Internal snapshot frozen (`locked` + export hash) | Before G1 | |
| G5 | Gap list for SO2–SO5 (Feb 2027) | After G1 | |

---

## H. What blocks rehearsal today

| Blocker | Owner | Doc |
|---------|-------|-----|
| LDN polygon load | GIS + steering | [`corpus/metadata/LDN-NAT-ALL_IMPORT_PLAN.md`](./corpus/metadata/LDN-NAT-ALL_IMPORT_PLAN.md) |
| R1 platform sign-off | Steering | [`R1_INFORMATION_ARCHITECTURE.md`](./R1_INFORMATION_ARCHITECTURE.md) §9 |
| Export jobs not implemented | ICT | Phase 4.1 in programme steps |
| Migrations 001–003 not applied | DBA | [`backend/APPLY_MIGRATIONS.md`](../backend/APPLY_MIGRATIONS.md) |

---

*Autonomous updates:* extend section F when export scripts land. *Review:* [`BLOCK_REVIEW_2026-11-23_reporting-desk-checklist.md`](./BLOCK_REVIEW_2026-11-23_reporting-desk-checklist.md)