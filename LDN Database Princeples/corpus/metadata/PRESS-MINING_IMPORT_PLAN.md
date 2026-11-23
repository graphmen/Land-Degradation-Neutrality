# Import plan — PRESS-MINING

**Layer ID:** PRESS-MINING · **Target (proposed):** `ldn.pressure_layers` (`theme = 'illegal_mining'`)

## Source

`important files/illegalminingshapefiles.zip` — **769** Lat/Long panning points ([`PRESSURE_LAYERS_QC.md`](./PRESSURE_LAYERS_QC.md)). — ~769 panning points (+ UTM variants).

## Pre-load

- **Access:** restrict to national/district roles (sensitivity)  
- Attribute dictionary in Annex C (extend on unpack)  
- Overlap with SO2 drought exposure maps (future)

## SO use

SO2 pressure; contextualises degradation hotspots near artisanal mining.

## Status

🔶 **Staging JSON** (769 Lat/Long) — shared file `public/pressure-layers-staging.json` · `GET /api/pressure-layers?theme=illegal_mining`  
⬜ PostGIS until **S8** + migration **003** (S2 Phase C).