# Import plan — PRESS-INVASIVE

**Layer ID:** PRESS-INVASIVE · **Target (proposed):** `ldn.pressure_layers` (`theme = 'invasive'`)

## Source

`important files/invasivespecies.zip` — nested zips; **2,035** Lat/Long points (see [`PRESSURE_LAYERS_QC.md`](./PRESSURE_LAYERS_QC.md)).

## Pre-load

- [x] Nested zip inventory + field list (`pressure_layer_qc.py`)  
- Unify species taxon fields into code list (future annex)  
- CRS harmonize to WGS 84 for web; retain UTM copies in metadata  
- Link drylands mobile `invasive_species` narratives where ward matches

## SO use

SO1-2 degradation drivers; pressure overlay in Verification workspace.

## Status

⬜ Plan only — no ogr2ogr until `pressure_layers` table migration drafted (Phase 2).