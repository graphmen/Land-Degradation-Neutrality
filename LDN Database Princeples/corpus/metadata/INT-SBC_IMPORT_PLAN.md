# Import plan — INT-SBC (soil & water conservation points)

**Layer ID:** INT-SBC · **Target (proposed):** `ldn.intervention_spatial` with `theme = 'sbc'`

## Source

`important files/sbc.zip` — **1,367** `SBC_LatLong` points confirmed ([`INTERVENTION_SPATIAL_QC.md`](./INTERVENTION_SPATIAL_QC.md)).

## Pre-load

- [x] Nested zip inventory + fields (`intervention_spatial_qc.py`)  
- Deduplicate against existing `intervention_spatial` by coordinates + name hash  
- Map attributes to Annex C (when dictionary extended)  
- Sensitivity: public map vs authenticated only

## SO use

Restoration / bright-spot context (SO4); overlap analysis with LDN-NAT-ALL degraded units.

## Status

⬜ Metadata row only — load in Phase 2 after EMA confirms attribute dictionary.