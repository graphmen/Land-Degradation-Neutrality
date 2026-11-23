# Study — Corpus QC lineage (steering archive)

**Purpose:** One index of **automated QA** on EMA `important files/` and field cache — attach to R1 / GIS segment.  
**Live JSON:** `public/qc-programme-summary.json` · `npm run qc:summary`

---

## 1. QC artefacts map

| Layer / topic | Script | Output JSON | Steering gate |
|---------------|--------|-------------|---------------|
| CEID ↔ LDN-NAT-ALL | `ceid_join_qc.py` · `npm run qc:ceid` | `qc-ceid-join-report.json` | **Q2**, S3–S4 · Study: `CEID_UNMATCHED_STUDY.md` |
| Pressure zips | `pressure_layer_qc.py` | `qc-pressure-layers-report.json` | **S8** |
| Pressure staging | `import_pressure_layers.py` | `pressure-layers-staging.json` | S8 → PostGIS |
| Interventions QC | `intervention_spatial_qc.py` | `qc-intervention-spatial-report.json` | S9 |
| EMA projects | `import_ema_projects.py` | `ema-projects-import.json` | INT-PROJECTS |
| SBC staging | `import_sbc_staging.py` | `intervention-sbc-staging.json` | INT-SBC |
| Drylands ILUP | `import_drylands.py` · `npm run import:drylands` | `drylands-data.json` | FIELD-DRYILUP |
| SO1 rasters (pending) | `national_raster_qc.py` | `qc-national-rasters-report.json` | **S10–S12** |
| LC stack (wrapper) | `lc_stack_qc.py` | → national_raster QC | S10 |
| Reporting §F | `reporting_desk_dry_run.ts` | `reporting-desk-dry-run.json` | F1–F7 |

---

## 2. Refresh procedure (before steering)

```powershell
npm run qc:refresh
```

Optional staging re-import before steering (slow):

```powershell
npm run import:pressure-staging
npm run import:sbc-staging
npm run qc:summary
```

---

## 3. API read (demo)

| Route | Use |
|-------|-----|
| `GET /api/qc/summary` | Aggregated counts for national overview (R2) |
| `GET /api/corpus-layers` | Register rows + import_status |

---

## 4. Honest gaps

| Gap | Owner |
|-----|--------|
| Q1 Area unit on polygons | EMA GIS |
| LC/LPD/SOC GeoTIFFs not in repo | EMA + S10–S12 |
| PostGIS not loaded | S2 runbook |
| iOS folder | Mac + 3.1 |

---

*Parent:* [`CORPUS_METADATA_REGISTER.md`](./CORPUS_METADATA_REGISTER.md) · [`STEERING_GIS_SO1_DECISION_PACK.md`](../STEERING_GIS_SO1_DECISION_PACK.md)