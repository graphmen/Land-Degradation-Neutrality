# Programme annexes — index and session log

All annexes support the **national LDN database** (Deliverable A) and **collection tools** (Deliverable B). Each annex is developed in **~60-minute blocks**, then **committed and pushed** (see [REPOSITORY_WORKFLOW.md](./REPOSITORY_WORKFLOW.md)).

| Annex | File | Version | Status | SO / programme focus |
|-------|------|---------|--------|----------------------|
| **A** | [ANNEX_A_FIELD_MAPPING.md](./ANNEX_A_FIELD_MAPPING.md) | 0.3 | Draft — EMA sign-off pending | SO1 LDN + Soil (mobile) |
| **B** | [ANNEX_B_DRYLANDS_FIELD_MAPPING.md](./ANNEX_B_DRYLANDS_FIELD_MAPPING.md) | 0.1 | Draft — this session | ILUP drylands / GEF programme |
| **C** | [ANNEX_C_SPATIAL_LAYERS_REGISTER.md](./ANNEX_C_SPATIAL_LAYERS_REGISTER.md) | 0.2 | Attribute dictionaries unpacked | National LDN polygons + EMA layers |
| **D** | [ANNEX_D_INTERVENTIONS_REGISTER.md](./ANNEX_D_INTERVENTIONS_REGISTER.md) | 0.2 | EMA 47-project map | Restoration / SO4 / counterbalancing evidence |
| **E** | [ANNEX_E_VERIFICATION_AND_REPORTING.md](./ANNEX_E_VERIFICATION_AND_REPORTING.md) | 0.1 | Draft — this session | Verification + PRAIS export packages |

---

## Session log

| Date | Duration | Outcome | Git |
|------|----------|---------|-----|
| 2026-11-23 | ~60 min | Annex A (LDN + Soil) | In commit `3a44813` |
| 2026-11-23 | ~60 min | Guide v0.3, Work Plan, EMA `important files/`, Word `.docx` | In commit `3a44813` |
| 2026-11-23 | ~60 min | Annexes B, C, D + workflow + index | Pushed |
| 2026-11-23 | ~30 min | Mobile-only collection policy (no external survey platform in programme docs) | `b5b85c9` |
| 2026-11-23 | ~60 min | Annex C v0.2 unpack, Annex E verification/PRAIS, Annex D projects | *(this commit)* |

---

## Next sessions (planned)

1. **Annex B v0.2** — EMA review; `erosion_severity` Mild vs Low; full Supabase column parity.  
2. **GIS workshop** — CEID ↔ polygon `Id` join; `Area` units.  
3. **Phase 1 code** — `reference_monitoring_sites` import from Excel; `verification_status` on API.  
4. **PostGIS load** — `national_ldn_units` + `intervention_spatial` staging scripts.