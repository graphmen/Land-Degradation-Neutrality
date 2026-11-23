# Programme execution steps (recommended order)

Follow this sequence for **national LDN database + Android/iOS collection**. Update checkboxes after each **~60-minute block**; **commit and push** (see [REPOSITORY_WORKFLOW.md](./REPOSITORY_WORKFLOW.md)).

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
| 0.7 | EMA steering sign-off on 0.1–0.6 | Minutes | ⬜ |

---

## Phase 1 — Reference data (current sprint)

| Step | Action | Output | Done |
|------|--------|--------|------|
| 1.1 | Import monitoring sites XLS | `public/reference-monitoring-sites.json` | ✅ this session |
| 1.2 | API governance fields on reads | `lib/compliance-metadata.ts` + `/api/*` | ✅ this session |
| 1.3 | Code list v1.0 in database | `backend/migrations/001_reference_code_lists.sql` | 🔶 SQL drafted (not applied) |
| 1.4 | Fix LDN denormalized ETL | `land_cover` / `land_use` in cache | ✅ 150/150 |
| 1.5 | Drylands erosion `Mild` → `low` on import | API read + Excel import | ✅ |
| 1.6 | Mobile forms use `reference-code-lists` | All three main forms (bundled JSON) | ✅ |

---

## Phase 2 — Database hardening

| Step | Action | Done |
|------|--------|------|
| 2.1 | PostGIS `national_ldn_units` from combined shapefile | ⬜ |
| 2.2 | Import `intervention_spatial` (47 EMA projects) | ✅ staging `ema-projects-import.json` |
| 2.3 | Mobile sync → DB first; JSON cache second |
| 2.4 | `verification_log` + review UI (district / national) |

---

## Phase 3 — Mobile (Deliverable B)

| Step | Action |
|------|--------|
| 3.1 | iOS build + TestFlight / internal testing |
| 3.2 | Align severity/land-cover labels to Annex F |
| 3.3 | Validator ↔ national polygon `Id` join (after GIS workshop) |

---

## Phase 4–5 — Reporting

| Step | Action |
|------|--------|
| 4.1 | Export jobs `EXP-SO1-*` (Annex E) |
| 4.2 | SO1 rehearsal checklist (Nov 2026 target) |
| 5.1 | Lock snapshot + PRAIS package |

---

**Next automatic block:** **2.1** PostGIS LDN units stub · interventions API read staging · EMA one-pager for step 0.7.

**Block reviews:** [ETL](./BLOCK_REVIEW_2026-11-23_phase1-etl.md) · [Mobile/imports](./BLOCK_REVIEW_2026-11-23_phase1-mobile-and-imports.md)