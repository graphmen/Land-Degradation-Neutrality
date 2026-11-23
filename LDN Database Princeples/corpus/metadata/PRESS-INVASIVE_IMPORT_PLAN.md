# Import plan — PRESS-INVASIVE

**Layer ID:** PRESS-INVASIVE · **Target (proposed):** `ldn.pressure_layers` (`theme = 'invasive'`)

## Source

`important files/invasivespecies.zip` — ~2,035 points + species-split shapefiles.

## Pre-load

- Unify species taxon fields into code list (future annex)  
- CRS harmonize to WGS 84 for web; retain UTM copies in metadata  
- Link drylands mobile `invasive_species` narratives where ward matches

## SO use

SO1-2 degradation drivers; pressure overlay in Verification workspace.

## Status

⬜ Plan only — no ogr2ogr until `pressure_layers` table migration drafted (Phase 2).