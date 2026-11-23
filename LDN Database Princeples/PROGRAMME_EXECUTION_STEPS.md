# Programme execution steps (recommended order)

Follow this sequence for **national LDN database + Android/iOS collection**. Update checkboxes after each **~60-minute block**; **commit and push** (see [REPOSITORY_WORKFLOW.md](./REPOSITORY_WORKFLOW.md)).

---

## Phase R — Government platform redesign (NEW — steering priority)

| Step | Action | Artefact | Done |
|------|--------|----------|------|
| R0 | International LDN benchmark | Blueprint + [`INTERNATIONAL_COUNTRY_DOSSIERS.md`](./INTERNATIONAL_COUNTRY_DOSSIERS.md) (11 countries) | 🔶 v0.1 |
| R0b | National data corpus register | [`NATIONAL_DATA_CORPUS.md`](./NATIONAL_DATA_CORPUS.md) | ✅ living |
| R0c | Peer twinning + differentiator (Study) | [`STEERING_PEER_TWINNING_RECOMMENDATION.md`](./STEERING_PEER_TWINNING_RECOMMENDATION.md) · [one-pager](./ZIMBABWE_DIFFERENTIATOR_STEERING_ONE_PAGER.md) | 🔶 confirm twins |
| R1 | EMA UX / information architecture sign-off | [`R1_INFORMATION_ARCHITECTURE.md`](./R1_INFORMATION_ARCHITECTURE.md) | 🔶 draft for sign-off |
| R2 | New government web shell (replace OAU chrome) | Module map §4 in blueprint | ⬜ |
| R3 | Cutover: Evidence registry default landing | Retire “telemetry dashboard” copy | ⬜ |

**Rule:** No more cosmetic patches on the old dashboard until **R1** is signed. Backend/mobile work continues.

---

## Phase 0 — Documentation & governance

| Step | Action | Annex / artefact | Done |
|------|--------|------------------|------|
| 0.1 | Mobile-only collection policy | Project Guide §1.2 | ✅ |
| 0.2 | Field maps LDN, Soil, Drylands | A, B | ✅ |
| 0.3 | Spatial layer register | C v0.2 | ✅ |
| 0.4 | Interventions register | D v0.2 | ✅ |
| 0.5 | Verification + PRAIS exports | E v0.1 | ✅ |
| 0.6 | Code lists v0.9 draft | F + `reference-code-lists.v0.9.json` | ✅ this session |
| 0.7 | EMA steering sign-off on 0.1–0.6 | [`EMA_STEERING_ONE_PAGER.md`](./EMA_STEERING_ONE_PAGER.md) · [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md) | 🔶 ready for meeting |

---

## Phase 1 — Reference data (current sprint)

| Step | Action | Output | Done |
|------|--------|--------|------|
| 1.1 | Import monitoring sites XLS | `public/reference-monitoring-sites.json` | ✅ this session |
| 1.2 | API governance fields on reads | `lib/compliance-metadata.ts` + `/api/*` | ✅ this session |
| 1.3 | Code list v1.0 in database | `001_reference_code_lists.sql` + `001_reference_code_lists_seed.sql` | 🔶 ready to apply |
| 1.4 | Fix LDN denormalized ETL | `land_cover` / `land_use` in cache | ✅ 150/150 |
| 1.5 | Drylands erosion `Mild` → `low` on import | API read + Excel import | ✅ |
| 1.6 | Mobile forms use `reference-code-lists` | All three main forms (bundled JSON) | ✅ |

---

## Phase 2 — Database hardening

| Step | Action | Done |
|------|--------|------|
| 2.1 | PostGIS `national_ldn_units` from combined shapefile | 🔶 `002` + [LDN-NAT-ALL plan](./corpus/metadata/LDN-NAT-ALL_IMPORT_PLAN.md); CEID QA **93/147** ([`CEID_JOIN_QC.md`](./corpus/metadata/CEID_JOIN_QC.md)) |
| 2.1b | Corpus metadata register | [`corpus/CORPUS_METADATA_REGISTER.md`](./corpus/CORPUS_METADATA_REGISTER.md) | ✅ |
| 2.5 | Pressure layers schema stub | `003_pressure_layers.sql` + import plans; zip QC **2035 / 769** Lat/Long ([`PRESSURE_LAYERS_QC.md`](./corpus/metadata/PRESSURE_LAYERS_QC.md)) | 🔶 QC done |
| 2.2 | Import `intervention_spatial` (47 EMA projects) | ✅ staging JSON; shapefile QC **47** geog ([`INTERVENTION_SPATIAL_QC.md`](./corpus/metadata/INTERVENTION_SPATIAL_QC.md)) |
| 2.3 | Mobile sync → DB first; JSON cache second | 🔶 `/api/submit/*` + queue → localhost/vercel |
| 2.4 | `verification_log` + review UI (district / national) | P1 ✅ [`GOVERNANCE_API_P1.md`](./design/GOVERNANCE_API_P1.md) · P2 audit ✅ [`GOVERNANCE_API_P2.md`](./design/GOVERNANCE_API_P2.md) · UI after R1 |

---

## Phase 3 — Mobile (Deliverable B)

| Step | Action | Done |
|------|--------|------|
| 3.1 | iOS build + TestFlight; production API URL | [`MOBILE_API_DEPLOY.md`](./MOBILE_API_DEPLOY.md) | 🔶 doc |
| 3.2 | Align severity/land-cover labels to Annex F | 🔶 codes + **land use** list (`ldn_land_use_type`) |
| 3.3 | Validator ↔ national polygon `Id` join (after GIS workshop) | ⬜ |

---

## Phase 4–5 — Reporting

| Step | Action | Done |
|------|--------|------|
| 4.1 | Export jobs `EXP-SO1-*` (Annex E); SO1-1 matrix design | FIELD · STATUS · META · LC template | 🔶 stubs |
| 4.2 | SO1 rehearsal checklist (Nov 2026 target) | [`REPORTING_DESK_CHECKLIST.md`](./REPORTING_DESK_CHECKLIST.md) · §F dry-run | 🔶 F2/F6/F7 |
| 5.1 | Lock snapshot + PRAIS package | | ⬜ |

---

**Autonomous mode:** [`AUTONOMOUS_EXECUTION.md`](./AUTONOMOUS_EXECUTION.md) — no “continue” required.

**Next automatic block:** R1 sign-off facilitation doc · Supabase apply runbook test · iOS build (3.1).

**Block reviews:** [Study twinning](./BLOCK_REVIEW_2026-11-23_study-peer-twinning.md) · [Discipline](./BLOCK_DISCIPLINE_60MIN.md)

**Block reviews:** [ETL](./BLOCK_REVIEW_2026-11-23_phase1-etl.md) · [Mobile/imports](./BLOCK_REVIEW_2026-11-23_phase1-mobile-and-imports.md) · [Mobile codes](./BLOCK_REVIEW_2026-11-23_phase3-mobile-codes.md)