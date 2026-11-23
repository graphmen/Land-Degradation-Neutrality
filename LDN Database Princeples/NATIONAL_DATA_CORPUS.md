# Zimbabwe national LDN data corpus

**This is not a dashboard dataset list.** It is the **governed, versioned national body of evidence** that feeds SO1, interventions, drylands, and PRAIS exports — with more assets arriving from EMA over time.

**Custodian:** EMA · **System of record (target):** PostgreSQL/PostGIS `ldn` schema · **Field channel:** national mobile app only.

---

## 1. Corpus layers (long-term continuity)

| Layer | What belongs here | Your assets today | Future assets |
|-------|-------------------|-------------------|---------------|
| **Reference** | Sites, code lists, admin units, forms | `reference-monitoring-sites.json` (28 geocoded); `reference-code-lists.v0.9.json`; EMA sites XLS | Ward gazette, CEID authority table |
| **National analytics** | Gridded/zonal SO1 inputs | Combined LDN shapefile (~254k units) in `important files/` | LPD rasters, SOC surfaces, Trends.Earth handoff |
| **Field operations** | Verifiable submissions | 150 LDN, 632 soil, 16+ drylands (cache + Supabase) | All new via mobile → `/api/submit/*` |
| **Programme spatial** | Pressures & implementation | projects (47), SBC (1367), invasives (2035), mining (769) zips | Forestry, livestock, water agency layers |
| **Reporting & compliance** | Period assessments, locked exports | Annex E states (design) | `EXP-SO1-*` packages per period |

**Principle:** Every file you provide lands in **one layer** with metadata — never dumped into a single map table.

---

## 2. Register — `important files/` (November 2026 drop)

See [`important files/README.md`](../important%20files/README.md). Summary:

| Dataset | Role in corpus | Continuity rule |
|---------|------------------|-----------------|
| Combined LDN shapefiles | National unit grid for validation & SO1 context | Version per import; CEID join TBD with EMA |
| Existing sites XLS | Monitoring / training network | Extend as new sites accredited |
| EMA projects | Restoration interventions | Merge to `intervention_record` after steering |
| SBC / invasives / mining | Degradation **pressure** layers | Thematic toggles; access control |

---

## 3. Field & derived data (already in repo)

| Stream | Count (approx.) | Governance |
|--------|-------------------|------------|
| LDN validations | 150 | ETL 150/150 `land_cover`+`land_use`; mobile codes |
| Soil cores | 632 | Texture/moisture codes Annex F |
| Drylands ILUP | 16+ | Erosion canonical codes |
| Interventions staging | 47 EMA + demo | `includeEma=true` on API |

---

## 4. Ingestion contract (every new file from EMA)

1. **Register** in Annex C (or appendix row) before load.  
2. **Metadata:** title, owner, vintage, CRS, licence, confidence, SO link.  
3. **Version:** `dataset_version`, `imported_at` — no silent overwrite.  
4. **Load:** PostGIS or reference JSON + API — not ad-hoc map paint.  
5. **Audit:** who imported, steering approval if reporting-eligible.

---

## 5. What we are building (not a dashboard)

The **National LDN Data Platform** consumes this corpus through:

- **Evidence registry** (field)  
- **Layer catalogue** (analytics + programme spatial)  
- **Verification** (states → lock for reporting)  
- **Reporting desk** (PRAIS rehearsal)  

The current Next.js routes are **temporary viewers** until Phase R2 government shell replaces them.

---

**Living register:** [`corpus/CORPUS_METADATA_REGISTER.md`](./corpus/CORPUS_METADATA_REGISTER.md)

**Autonomous runs:** [`AUTONOMOUS_EXECUTION.md`](./AUTONOMOUS_EXECUTION.md)

*Related:* [INTERNATIONAL_LDN_BENCHMARK_AND_ZIMBABWE_BLUEPRINT.md](./INTERNATIONAL_LDN_BENCHMARK_AND_ZIMBABWE_BLUEPRINT.md) · [ZIMBABWE_LDN_PROJECT_GUIDE.md](./ZIMBABWE_LDN_PROJECT_GUIDE.md) v0.7 amendment §1.4