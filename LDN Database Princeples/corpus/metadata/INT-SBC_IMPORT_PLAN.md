# Import plan — INT-SBC (soil & water conservation points)

**Layer ID:** INT-SBC · **Target (proposed):** `ldn.intervention_spatial` with `theme = 'sbc'`

## Source

`important files/sbc.zip` — primary `SBC_LatLong` (~1,367 points WGS 84); UTM subsets for field teams.

## Pre-load

- Deduplicate against existing `intervention_spatial` by coordinates + name hash  
- Map attributes to Annex C (when dictionary extended)  
- Sensitivity: public map vs authenticated only

## SO use

Restoration / bright-spot context (SO4); overlap analysis with LDN-NAT-ALL degraded units.

## Status

⬜ Metadata row only — load in Phase 2 after EMA confirms attribute dictionary.