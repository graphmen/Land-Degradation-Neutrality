# Design — R1 National layers module (corpus map)

**Block:** Design · **Status:** Draft for R1 sign-off  
**Implements:** R2 routes under `/layers/*` · **Not** OAU dashboard patches  
**Parent IA:** [`R1_INFORMATION_ARCHITECTURE.md`](../R1_INFORMATION_ARCHITECTURE.md) §3

---

## 1. Purpose

Give GIS leads and verifiers **governed access** to national analytics layers listed in [`CORPUS_METADATA_REGISTER.md`](../corpus/CORPUS_METADATA_REGISTER.md) — metadata, counts, sensitivity, and map view — **without** treating layers as decorative map tiles.

**Principle:** Catalogue first → attribution → optional map. Every row ties to `layer_id` and `dataset_version`.

---

## 2. Sub-modules (government labels)

| Nav label | `layer_id`(s) | Primary SO use | Data today (Nov 2026) |
|-----------|---------------|----------------|------------------------|
| **LDN units** | LDN-NAT-ALL | SO1-4 context, CEID join | Plan + QC; not PostGIS |
| **Interventions & programmes** | INT-PROJECTS, INT-SBC | SO4 | Projects **47** · SBC **1367** (`includeEma` / `includeSbc`) |
| **Pressures** | PRESS-INVASIVE, PRESS-MINING | SO1-2 / SO2 narrative | **Staging** 2804 pts · `GET /api/pressure-layers` |
| **Monitoring network** | REF-SITES | Operations QA | `reference-monitoring-sites.json` |
| **SO1 national inputs** | LC / LPD / SOC stacks | F3–F5 | Await delivery (S10–S12) |

SO1 rasters appear under **Analytics** in IA but **register** here for lineage (same catalogue row).

---

## 3. Wireframe — Layers hub

```
┌────────────────────────────────────────────────────────────────────┐
│ National layers                    Period: [2020-2023 ▼]          │
├────────────────────────────────────────────────────────────────────┤
│ Filter: Theme [all ▼]  Status [staging ▼]  Sensitivity [auth ▼]   │
├──────────┬───────────┬────────┬─────────┬──────────┬─────────────┤
│ layer_id │ title     │ count  │ vintage │ import   │ SO use      │
│ PRESS-*  │ …         │ 2804   │ 2026-11 │ staging  │ SO1-2       │
│ INT-*    │ …         │ 47     │ …       │ staging  │ SO4         │
│ …        │ …         │ …      │ …       │ …        │ …           │
├──────────┴───────────┴────────┴─────────┴──────────┴─────────────┤
│ [View metadata] [Open map] [Download staging JSON — role gated]   │
└────────────────────────────────────────────────────────────────────┘
```

**Map panel (secondary):** cluster points for staging layers; no heatmap “KPI” on landing.

---

## 4. API bindings (R2 — reuse existing routes)

| Layer group | Read API (interim) | Post-R2 enhancement |
|-------------|-------------------|---------------------|
| Pressures | `GET /api/pressure-layers?theme=` | PostGIS after S8 + `003` |
| Interventions | `GET /api/interventions` (+ EMA staging merge) | DB first |
| Monitoring | static `public/reference-monitoring-sites.json` or future route | — |
| LDN units | `GET /api/validator/ceid` (point QA) | PostGIS `national_ldn_units` |
| Corpus all | `GET /api/export/meta` | EXP-META rehearsal |

**Status smoke:** `GET /api/status` lists export/pressure routes.

---

## 5. RBAC & sensitivity

| layer_id | Default map visibility |
|----------|------------------------|
| PRESS-MINING | **National + GIS** only (`sensitivity: restricted`) |
| PRESS-INVASIVE | District aggregate or national (steering) |
| INT-PROJECTS | Authenticated |
| REF-SITES | Authenticated |
| LDN-NAT-ALL | National (no public full polygon dump until policy) |

Mobile app **does not** embed pressure maps in v1 (see [`MOBILE_PLATFORM_PARITY.md`](../MOBILE_PLATFORM_PARITY.md)).

---

## 6. Verification workspace link

When reviewing LDN evidence, optional panel **“Nearby pressures (staging)”**:

- Query `GET /api/pressure-layers` bbox around record lat/lng (R2)  
- Today: design-only; counts from district-level aggregate in narrative  

See [`VERIFICATION_WORKSPACE_SPEC.md`](../VERIFICATION_WORKSPACE_SPEC.md) § overlapping pressures.

---

## 7. R2 route map (no implementation until §9 signed)

| Route | Module |
|-------|--------|
| `/layers` | Hub table (manifest from `buildCorpusManifest`) |
| `/layers/ldn-units` | Unit catalogue + CEID validator link |
| `/layers/interventions` | INT-* |
| `/layers/pressures` | Theme toggle invasive / mining |
| `/layers/monitoring` | REF-SITES |

---

## 8. Steering checklist (layers slice of R1)

- [ ] Pressure **staging** acceptable until S8 PostGIS  
- [ ] Mining layer restricted to national role  
- [ ] No new public map on old OAU home  
- [ ] SBC load priority after projects (optional Phase 2.6)  

---

## 9. Programme dependencies

| ID | Unblocks |
|----|----------|
| Q1–Q2 | LDN units map fidelity |
| S8 | Pressure PostGIS |
| S10–S12 | SO1 raster rows in same hub |
| S2 Phase C | `pressure_layers` table |

---

*Block review:* [`BLOCK_REVIEW_2026-11-23_design-r1-national-layers.md`](./BLOCK_REVIEW_2026-11-23_design-r1-national-layers.md)