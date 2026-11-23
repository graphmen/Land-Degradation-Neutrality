# Intervention spatial — zip inventory QA

**Script:** [`scripts/intervention_spatial_qc.py`](../../../scripts/intervention_spatial_qc.py)  
**Report:** [`public/qc-intervention-spatial-report.json`](../../../public/qc-intervention-spatial-report.json)

## INT-SBC (`sbc.zip`)

| Layer | Features |
|-------|----------|
| **SBC_LatLong.shp** (authoritative) | **1,367** |
| UTM35 / UTM36 | 156 + 293 (subsets — do not add to national total) |

Rich attribute set: `SBCID`, ward/village/chief, river, land use, soil type, biodiversity, actions (`Action_Tak`), etc.

## INT-PROJECTS (`projects.zip`)

| Layer | Features |
|-------|----------|
| **ema_projects_combined_geog.shp** | **47** (matches staging `ema-projects-import.json`) |
| UTM 35 / 36 | 65 + 65 (coordinate splits — reconcile before load; may overlap geog) |

**Fields (geog):** `Name`, `ward`, `village`, `year_estab`, `activty`, `funding_pa`, `Role_of_em`.

## Steering

1. Load **LatLong / combined geog** layers first per theme.  
2. Extend Annex C attribute dictionary from DBF field list in report.  
3. Projects UTM vs geog count mismatch (47 vs 65) — EMA confirms which is current register.