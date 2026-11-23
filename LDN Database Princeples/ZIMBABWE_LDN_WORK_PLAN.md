# Zimbabwe National LDN Database & Data Collection Tools — Work Plan

**Document:** Work Plan (companion to Project Development Guide)  
**Version:** 0.1 (draft)  
**Date:** 2026-11-23  
**Owner:** EMA LDN programme (steering group)  
**Status:** For EMA review — iterative delivery in **~60-minute working sessions** plus phased sprints

---

## 1. Purpose

This work plan schedules how EMA will evolve the existing OAU platform into:

1. **Deliverable A** — A governed **national LDN database** (PostgreSQL/PostGIS, audit, metadata, reporting exports).  
2. **Deliverable B** — **LDN data collection tools** (mobile + Kobo, offline, verification workflows).

The plan respects **progressive enhancement**: the current dashboard and mobile app remain usable after every increment.

**Primary standards:** UNCCD Strategic Framework, SDG **15.3.1**, GPG v2 + **2025 Addendum**, PRAIS 4, national workshop decisions (Harare, Sept 2026).

---

## 2. Objectives (measurable)

| # | Objective | Success indicator | Target date |
|---|-----------|-------------------|-------------|
| O1 | Governed canonical schema for field + reference data | Signed Annex A + code lists in DB | Q1 2026 programme |
| O2 | System of record (not JSON files) for LDN/soil/drylands | DB-first sync; JSON as cache only | Phase 2 complete |
| O3 | Verification workflow to national reporting quality | States: submitted → verified → approved → locked | Phase 3 |
| O4 | National spatial layers from EMA `important files` registered in DB | Layer catalogue + PostGIS load | Phase 2–4 |
| O5 | SO1 reporting rehearsal | Checklist + export package dry run | Phase 5 (ahead of **Nov 2026** SO1) |
| O6 | Mobile/Kobo alignment | One code-list source; form version pins | Phase 3 |

---

## 3. Governance

### 3.1 Roles (RACI summary)

| Role | Responsibility |
|------|----------------|
| **Steering group** | Approves scope, phases, code lists, go-live for reporting |
| **National reporting officer** | Reporting period, status rules, PRAIS packages |
| **Database administrator** | PostGIS, migrations, backups, access control |
| **GIS lead** | National layers, Trends.Earth handoff, CRS/metadata |
| **Field operations lead** | Kobo/mobile, enumerators, QA |
| **ICT / development team** | OAU codebase, APIs, sync, security |
| **External verifier (UNCCD workshop)** | Methodology sign-off (as required) |

### 3.2 Change control

- **Code lists & Kobo form changes** — Steering approval only after Phase 1 registry exists.  
- **Production schema** — Migration scripts + rollback note; no ad-hoc Supabase edits.  
- **Documentation** — Guide (Word + Markdown), Work Plan, Annex A updated on each approved phase gate.

### 3.3 Working rhythm

| Activity | Cadence | Output |
|----------|---------|--------|
| Deep working session | **60 minutes** (as agreed) | Annex tables, layer specs, one work-package slice |
| Sprint | 2 weeks | Shippable increment on `main` / release branch |
| Steering review | Monthly (or per phase gate) | Signed minutes + updated Word guide |

---

## 4. Work packages

### WP0 — Alignment & documentation *(Phase 0, weeks 1–3)*

| Task | Deliverable | Owner | Depends on |
|------|-------------|-------|------------|
| WP0.1 | Approve Project Guide v0.3+ (Word + MD) | Steering | Workshop materials |
| WP0.2 | Annex A (LDN + Soil) EMA sign-off | Reporting + field leads | [ANNEX_A_FIELD_MAPPING.md](./ANNEX_A_FIELD_MAPPING.md) |
| WP0.3 | Inventory EMA `important files` + README | GIS | Folder on disk |
| WP0.4 | Appoint national reporting officer in RACI | Steering | — |
| WP0.5 | Drylands / ILUP mapping session (Annex B) | Field ops | Excel/Kobo |

**Exit criteria:** Signed Phase 0 checklist; no production Kobo breaking changes.

---

### WP1 — Reference data & compliance metadata *(Phase 1, weeks 4–7)*

| Task | Deliverable | Owner |
|------|-------------|-------|
| WP1.1 | `reference_code_lists` table + JSON export | DBA |
| WP1.2 | UNCCD 7-class + ZW subclasses + transition matrix | GIS + reporting |
| WP1.3 | `reporting_period`, `verification_status`, `data_tier` on APIs | Dev |
| WP1.4 | Zimbabwe baseline/period config (t₀, 4-year windows) | Reporting officer |
| WP1.5 | Load **Existing sites** XLS → reference table | GIS |
| WP1.6 | Fix LDN ETL denormalization (`land_cover`, `land_use`) | Dev |

**Exit criteria:** Dashboard reads governed labels; code list version `v1.0` published.

---

### WP2 — Database hardening *(Phase 2, weeks 8–13)*

| Task | Deliverable | Owner |
|------|-------------|-------|
| WP2.1 | Consolidate `ldn_validations`, `soil_samples`, `drylands_observations` | DBA |
| WP2.2 | Audit log; retire `*-modifications.json` pattern | Dev |
| WP2.3 | Kobo sync → staging → production → cache refresh | Dev |
| WP2.4 | PostGIS import: **Combined LDN shapefiles** (versioned) | GIS |
| WP2.5 | Layer registry API for web + validator | Dev |

**Exit criteria:** New submissions land in DB first; national LDN polygon layer queryable.

---

### WP3 — Collection tools alignment *(Phase 3, weeks 14–19)*

| Task | Deliverable | Owner |
|------|-------------|-------|
| WP3.1 | Mobile forms match Kobo code lists | Field + dev |
| WP3.2 | Validator: confirm/reject/adjust vs national grid | Dev |
| WP3.3 | Offline sync QA (conflicts, GPS rules) | Field ops |
| WP3.4 | Form versioning (`form_version_id` on each submission) | DBA + dev |

**Exit criteria:** End-to-end field test in one district; verifier sign-off recorded in DB.

---

### WP4 — National analytics & pressure layers *(Phase 4, weeks 20–27)*

| Task | Deliverable | Owner |
|------|-------------|-------|
| WP4.1 | Import projects, SBC, invasives, illegal mining shapefiles | GIS |
| WP4.2 | Trends.Earth or national LPD/SOC rasters (tier tagged) | GIS |
| WP4.3 | Status map prototype (degraded/stable/improved) per GPG | Reporting |
| WP4.4 | PRAIS-oriented export job (GeoPackage/CSV + metadata) | Dev + reporting |
| WP4.5 | Counterbalancing pilot (one land type, one region) | Steering |

**Exit criteria:** One complete SO1 evidence package generated from the system.

---

### WP5 — Reporting dry run *(Phase 5)*

| Task | Deliverable | Owner |
|------|-------------|-------|
| WP5.1 | SO1 rehearsal checklist (Nov 2026 deadline) | Reporting officer |
| WP5.2 | Gap analysis SO2–SO5 (Feb 2027) | Steering |
| WP5.3 | Training for district reviewers on verification UI | Field ops |

---

### WP6 — Operations & sustainability *(ongoing)*

| Task | Deliverable |
|------|-------------|
| WP6.1 | Backup, disaster recovery, Supabase/hosting decision |
| WP6.2 | Security review (roles, secrets, government hosting) |
| WP6.3 | User manuals (web, mobile, database module) |
| WP6.4 | Annual code-list review |

---

## 5. Timeline (indicative)

Assuming start **November 2026**; adjust after steering approval.

| Phase | Calendar | Work packages | Key milestone |
|-------|----------|---------------|---------------|
| Phase 0 | Nov 2026 (w1–3) | WP0 | Guide + Annex A approved |
| Phase 1 | Dec 2026 | WP1 | Code lists v1.0 |
| Phase 2 | Jan–Feb 2027 | WP2 | DB-first sync + LDN polygons |
| Phase 3 | Mar–Apr 2027 | WP3 | Mobile/Kobo parity |
| Phase 4 | May–Jul 2027 | WP4 | SO1 export package |
| Phase 5 | Aug 2027 | WP5 | Reporting dry run |

**Critical external deadline:** National **SO1** reporting **November 2026** — Phase 0–1 and partial WP2 may need **fast-track** if the programme must submit using improved evidence even before full DB cutover. Steering should confirm **minimum viable reporting** scope.

---

## 6. Deliverables matrix

| ID | Deliverable | Format | Standards link |
|----|-------------|--------|----------------|
| D1 | Project Development Guide | Word + Markdown | Programme charter |
| D2 | Work Plan (this document) | Word + Markdown | Planning |
| D3 | Annex A — field mapping | Markdown | SO1 field tier |
| D4 | Annex B — drylands mapping | Markdown (TBD) | ILUP |
| D5 | Annex C — EMA spatial register | Markdown | Metadata / ISO-style |
| D6 | Code list registry | DB + export | UNCCD legend, LPD |
| D7 | National LDN database (production) | PostGIS | Deliverable A |
| D8 | Mobile + Kobo collection | APK + XLSForm | Deliverable B |
| D9 | PRAIS / Trends.Earth export package | Files + metadata | PRAIS 4 |

---

## 7. Risk register (summary)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Code list mismatch (mobile vs Kobo) | Wrong national totals | WP1 single registry; block form deploy until aligned |
| JSON remains source of truth | Audit failure | WP2 DB-first policy |
| Large shapefile drift | Wrong validation polygons | Versioned imports; GIS sign-off per version |
| Reporting deadline before Phase 4 | Incomplete automation | Define MVP export path in Phase 1 |
| Skills / staffing gaps | Slipped phases | 60-min sessions + clear RACI; prioritize WP1–2 |

---

## 8. Quality assurance & standards checklist

Each release candidate must pass:

- [ ] Field record has uuid, time, location, form version (when implemented).  
- [ ] Land cover mappable to UNCCD 7-class or documented national extension.  
- [ ] SOC samples respect 0–30 cm where Tier 2 claimed.  
- [ ] No reporting export without `verification_status` = approved/locked where required.  
- [ ] Spatial layer has CRS, source, vintage in catalogue.  
- [ ] Changes traceable in audit log (post WP2).

Full checklist duplicated in Project Guide §14.

---

## 9. Immediate next actions (next 60-minute sessions)

| Session | Focus | Output |
|---------|-------|--------|
| **Done** | Annex A LDN + Soil | [ANNEX_A_FIELD_MAPPING.md](./ANNEX_A_FIELD_MAPPING.md) |
| **Next 1** | Annex B Drylands + ILUP Excel | Field map draft |
| **Next 2** | EMA `LDN shapefiles` attribute dictionary | Annex C update |
| **Next 3** | Code list workshop (land cover + severity) | `v0.9` code list for steering |
| **Next 4** | ETL fix + existing sites import spec | Dev ticket + SQL sketch |

---

## 10. Document control

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-11-23 | Initial work plan; aligned to Project Guide v0.3 |

**Approvals:** *(pending)*  
Steering chair: _______________  
EMA ICT: _______________