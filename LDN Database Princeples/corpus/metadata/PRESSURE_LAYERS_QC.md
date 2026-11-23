# Pressure layers — zip inventory QA

**Script:** [`scripts/pressure_layer_qc.py`](../../../scripts/pressure_layer_qc.py)  
**Report:** [`public/qc-pressure-layers-report.json`](../../../public/qc-pressure-layers-report.json)

EMA bundles are **nested zips** (Lat/Long master + UTM splits by species/zone).

## PRESS-INVASIVE (`invasivespecies.zip`)

| Inner archive | Features | CRS hint | Notes |
|---------------|----------|----------|--------|
| `Zim_InvasiveLatLong.shp` | **2,035** | Lat/Long (`LAT`,`LONG`) | Authoritative point count for register |
| UTM species splits | 485 | UTM 35/36 | Subsets — **do not sum with LatLong** for national total |

**Fields (LatLong):** `IASID`, `Village`, `Species`, area/estimate columns — see report.

## PRESS-MINING (`illegalminingshapefiles.zip`)

| Inner archive | Features |
|---------------|----------|
| `Gold_Chrome_Panning_LatLong.shp` | **769** |
| UTM35 / UTM36 | 203 + 192 (subsets) |

**Fields:** `IPID`, `Resource_p`, pit geometry stats, `Area_cover`, etc.

## Steering (before `003` load)

1. Confirm **single** national ingest per theme = **LatLong** layer only.  
2. Species / UTM files = derivative copies for GIS workflows, not duplicate PostGIS loads.  
3. Privacy — village names in attributes (`sensitivity` in metadata).

Re-run: `python scripts/pressure_layer_qc.py`