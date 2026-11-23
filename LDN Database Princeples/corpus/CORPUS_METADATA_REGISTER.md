# National LDN corpus — metadata register (living)

**Custodian:** EMA · **Updates:** one row per import; no silent overwrite (`dataset_version`).  
**Block type:** Data (corpus governance) · **Not** a dashboard artefact.

| Layer ID | Title | Custodian | Vintage | Geometry | Count | CRS | Tier | SO link | Import status | Doc |
|----------|-------|-----------|---------|----------|-------|-----|------|---------|---------------|-----|
| **LC-NAT-STACK** | National LC rasters t₀/t₁ (UNCCD 7-class) | EMA GIS / Trends.Earth | TBD (T1) | Raster | — | WGS 84 | Tier 1–2 | **SO1-1** | ⬜ await delivery | [LC plan](./metadata/LC-NAT-STACK_IMPORT_PLAN.md) |
| **LDN-NAT-ALL** | Combined LDN validation polygons | EMA GIS | 2026-11 EMA drop | Polygon | 254,873 | WGS 84 | National analytics | SO1 context | 🔶 plan only | [import plan](./metadata/LDN-NAT-ALL_IMPORT_PLAN.md) |
| **LDN-PROV-*** | Provincial LDN shapefile splits | EMA GIS | Same bundle | Polygon | varies | WGS 84 | National analytics | SO1 QA | ⬜ | Annex C |
| **REF-SITES** | Existing monitoring sites | EMA field ops | XLS “latest” | Point | 48 → 28 geocoded | WGS 84 | Reference | Operations | ✅ JSON | Phase 1.1 |
| **INT-PROJECTS** | EMA restoration projects | EMA programmes | 2026 drop | Point | 47 | WGS 84 | Programme spatial | SO4 | 🔶 staging JSON | Phase 2.2 |
| **INT-SBC** | Soil & water conservation points | EMA | 2026 drop | Point | 1,367+ | WGS 84 / UTM | Programme spatial | Restoration | ⬜ | [SBC plan](./metadata/INT-SBC_IMPORT_PLAN.md) |
| **PRESS-INVASIVE** | Invasive species observations | EMA | 2026 drop | Point | 2,035+ | WGS 84 | Pressure | SO1-2 | ⬜ | [invasives plan](./metadata/PRESS-INVASIVE_IMPORT_PLAN.md) |
| **PRESS-MINING** | Illegal panning / mining points | EMA | 2026 drop | Point | 769+ | WGS 84 | Pressure | SO2 | ⬜ | [mining plan](./metadata/PRESS-MINING_IMPORT_PLAN.md) |
| **FIELD-LDN** | LDN field validations (mobile/Kobo legacy) | EMA field | Rolling | Point | 150 | — | Field ops | SO1 verify | ✅ ETL | Annex A |
| **FIELD-SOIL** | Soil core surveys | EMA field | Rolling | Point | 632 | — | Field ops | SO1-3 tier 2 | ✅ partial | Annex A |
| **FIELD-DRY** | Drylands ILUP observations | EMA field | Rolling | Point | 16+ | — | Field ops | ILUP | ✅ partial | Annex B |

---

## Mandatory fields on every new EMA file (before load)

1. `title`, `abstract`, `custodian`, `contact`  
2. `vintage` (collection date / survey year)  
3. `crs`, `geometry_type`, `feature_count`  
4. `licence` / sensitivity (public / restricted)  
5. `lineage` — derived from which prior dataset  
6. `so_uses[]` — which reporting tables may cite this layer  
7. `reporting_period` — if applicable  
8. `confidence` — high / medium / low for steering  

Add a row here **first**, then Annex C §C.2, then migration/script.

**Template:** [`CORPUS_METADATA_TEMPLATE.md`](./CORPUS_METADATA_TEMPLATE.md) (PRAIS Annex II fields).

---

*Parent:* [`../NATIONAL_DATA_CORPUS.md`](../NATIONAL_DATA_CORPUS.md)