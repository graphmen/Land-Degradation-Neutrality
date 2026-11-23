# Import plan — LPD-NAT-RASTER (national land productivity)

**Layer ID:** LPD-NAT-RASTER · **Block:** Data (plan only)  
**Target:** Zonal stats → `EXP-SO1-LPD` (replaces template in `lib/exp-so1-lpd-export.ts`)  
**Steering:** **S11** · **Related:** [`PRESS-INVASIVE_IMPORT_PLAN.md`](./PRESS-INVASIVE_IMPORT_PLAN.md) (SO1-2 narrative only)

---

## 1. Purpose

**SO1-2** — area (km² and %) by LPD class: declining / stable / increasing / not_assessed.  
Distinct from:

- **LDN-NAT-ALL** (`LD` status for SO1-4 context)  
- **FIELD-LDN** point observations  
- **PRESS-*** point layers (drivers narrative, not LPD zonal totals)

---

## 2. Source options (steering **S11**)

| Option | Description |
|--------|-------------|
| **A** | Trends.Earth national LPD export (GPG-aligned) |
| **B** | EMA national VI time series → LPD classification |
| **C** | Validated default for rehearsal; replace with B before PRAIS lock |

**Delivery:** `important files/` — e.g. `lpd-national.tif` or pre-computed CSV from GIS.

---

## 3. Open questions

| # | Question | Blocks |
|---|----------|--------|
| L1 | VI / satellite source and years | Vintage in metadata |
| L2 | National class legend = 4-row export or 5-class Trends.Earth | Code list harmonization |
| L3 | Link to **PRESS-*** for driver story without double-counting | Reporting narrative |
| L4 | Same reporting unit as LC zonal stats (national vs admin) | Reconciliation with F3 |

---

## 4. Pre-load QA

- [ ] CRS and extent align with **LC-NAT-STACK** (or documented difference)  
- [ ] Class codes match `EXP-SO1-LPD` columns  
- [ ] Σ `area_percent` ≈ 100% (excluding not_assessed policy)  
- [ ] Methods note: VI formula, cloud mask, years compared  

---

## 5. Load procedure (after S11 + S2 Phase D)

1. Register row in [`CORPUS_METADATA_REGISTER.md`](../CORPUS_METADATA_REGISTER.md).  
2. Import raster / load zonal table in PostGIS.  
3. Wire `buildExpSo1LpdPackage` P2.  
4. **F4 dry-run** — `km2_cells_populated: 4`, `pass: true`.

---

## 6. Status

⬜ Awaiting EMA delivery + **S11** — template uses `source_layer_id: LPD-NAT-RASTER`.