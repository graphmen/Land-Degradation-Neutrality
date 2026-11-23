# Steering — pressure layers ingest (S8)

**Duration:** 5 min · **Blocks:** PostGIS migration `003` · **Evidence:** [`corpus/metadata/PRESSURE_LAYERS_QC.md`](./corpus/metadata/PRESSURE_LAYERS_QC.md)

---

## Decision

| ☐ | **S8 approved** — National PostGIS load uses **Lat/Long** point layers only per theme |
| ☐ | **S8 deferred** | |

**Staging today:** **2804** points · `GET /api/pressure-layers` (no PostGIS until S8 + S2)

---

## Why (study summary)

| Theme | Authoritative file | Do **not** double-count |
|-------|-------------------|-------------------------|
| Invasive | `Zim_InvasiveLatLong.shp` (2035) | UTM species splits |
| Mining | `Gold_Chrome_Panning_LatLong.shp` (769) | UTM35/36 subsets |

UTM copies are for GIS workflows; **one national row per theme** in corpus.

---

## If approved

1. Apply S2 Phase A+B before `003`  
2. Run `scripts/import_pressure_layers.py` → PostGIS (future block)  
3. Note village-name sensitivity in metadata (privacy briefing)

*Parent:* [`STEERING_GIS_SO1_DECISION_PACK.md`](./STEERING_GIS_SO1_DECISION_PACK.md)