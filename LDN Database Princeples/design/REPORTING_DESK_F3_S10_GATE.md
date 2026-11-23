# Design — Reporting desk F3 gate (SO1-1 / steering S10)

**Block:** Design · **Status:** v0.1  
**Links:** [`REPORTING_DESK_CHECKLIST.md`](../REPORTING_DESK_CHECKLIST.md) §F3 · [`LC-NAT-STACK_IMPORT_PLAN.md`](../corpus/metadata/LC-NAT-STACK_IMPORT_PLAN.md)

---

## 1. What “F3 pass” means

F3 is **not** “CSV exists.” F3 passes when the national reporting officer can defend **km²** in the 7×7 matrix in PRAIS.

| Stage | `EXP-SO1-LC` status | F3 dry-run `pass` |
|-------|---------------------|-------------------|
| **R0** (now) | `template_only`, `area_km2` null | `false` — corpus registered only |
| **R1** | Same; steering **S10** signed | `false` — rasters catalogued |
| **R2** | Zonal stats loaded | `true` when Σ row totals ≈ national land area (± agreed tolerance) |

---

## 2. S10 sub-gates (tick in reporting desk)

| ID | Gate | Evidence | Auto in dry-run |
|----|------|----------|-----------------|
| S10a | **T1** raster authority chosen (Trends.Earth / EMA / hybrid) | Steering minutes | `steering_signed_t1: false` until minutes in repo |
| S10b | **LC-NAT-STACK** row in corpus register | `EXP-META` / register | `corpus_registered: true` |
| S10c | GeoTIFF **t₀ + t₁** in EMA custody | `important files/` + YAML vintage | `raster_delivered: false` |
| S10d | Legend crosswalk version = code list **v1.0** | Annex F + `code_list_version` | manual |
| S10e | Zonal tabulation signed by GIS lead | Methods note in `metadata.json` | `km2_populated` count = 49 |

---

## 3. Desk procedure (when rasters land)

1. Run **F1** — confirm `layer_id: LC-NAT-STACK` in manifest (11 layers).  
2. Complete GIS QA per import plan §4.  
3. Run zonal → replace template (`buildExpSo1LcPackage` P2 — future).  
4. **F3 dry-run** — expect `km2_cells_populated: 49`, `pass: true`.  
5. Spot-check **5** FIELD-LDN **locked** points vs t₀/t₁ classes (QA annex).  
6. Attach **`EXP-META`** citations (Annex II) before PRAIS upload.

---

## 4. Dry-run JSON (`gates.s10_f3`)

Populated by `scripts/reporting_desk_dry_run.ts`:

- `corpus_registered`, `import_status`, `template_rows`, `km2_cells_populated`  
- `required_for_pass[]` — human-readable blockers until rehearsal pass  
- `pass` — remains `false` until all S10e criteria met

---

## 5. API (unchanged until P2)

`GET /api/export/so1-lc` — template CSV today; add `?eligibility=national` when matrix is signed.