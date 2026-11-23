# Block review — Data — CEID shapefile join QC (full run)

| | |
|---|---|
| **Type** | Data (corpus / steering evidence) |
| **Duration** | ~60 min autonomous |
| **Outcome** | Unzipped Combined SHP locally (gitignored); enhanced `ceid_join_qc.py`; `qc-ceid-join-report.json`; `CEID_JOIN_QC.md`; partial `LDN-NAT-ALL_METADATA.yaml` |

## Numbers for steering

- **254,873** polygons, **43,455** unique `Id` (~5.87 polygons per Id)
- Field **147** unique CEIDs; best interim rule **`second_segment`** → **93** matches (**63.3%**)
- Unmatched cluster: **`ZC*`**, **`HP1`**, **`Muchawona`**, **`PLR4`**, plus residual double-segment (see report)
- **`Area`**: mean ~153, max ~3.68M — **Q1 still open**

## Committed vs local only

- Repo: script, report, metadata docs, `.gitignore` for extracted `important files/LDN shapefiles/`
- Machine only: extracted shapefiles (re-unzip from `LDN shapefiles.zip`)

## Next block (programme queue)

1. **Design:** SO1 transition matrix sketch (Annex E / reporting desk) — no new web UI  
2. **After EMA Q1–Q2:** finalize metadata YAML + `ogr2ogr` per `002`  
3. Re-run CEID QC when join rule is signed