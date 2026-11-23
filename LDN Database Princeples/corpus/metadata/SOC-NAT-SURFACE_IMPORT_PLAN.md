# Import plan — SOC-NAT-SURFACE (national SOC Tier-1)

**Layer ID:** SOC-NAT-SURFACE · **Block:** Data (plan only)  
**Target:** Tier-1 block in `EXP-SO1-SOC` (`lib/exp-so1-soc-export.ts`)  
**Tier-2:** **FIELD-SOIL** (632 cores — already in cache)  
**Steering:** **S12**

---

## 1. Purpose

**SO1-3** requires:

| Tier | Source | Package section |
|------|--------|-----------------|
| **Tier 1** | National SOC surface / stock (0–30 cm) | `tier1_national` in `EXP-SO1-SOC` |
| **Tier 2** | Field soil cores + lab linkage | Tier-2 CSV (632 rows) |

National raster is **not** a substitute for locked field samples where Tier-2 is claimed.

---

## 2. Source options (steering **S12**)

| Option | Description |
|--------|-------------|
| **A** | Trends.Earth national SOC export |
| **B** | EMA national pedology / lab upscaling surface |
| **C** | Tier-1 default for rehearsal; Tier-2 field evidence for narrative |

**Delivery:** `important files/` — e.g. `soc-national-0-30.tif` or stock table CSV.

---

## 3. Open questions

| # | Question | Blocks |
|---|----------|--------|
| O1 | Report **stock (t C)** vs **concentration (%)** nationally | PRAIS table format |
| O2 | Depth standard 0–30 cm vs additional 30–100 cm appendix | F5 checklist |
| O3 | Lab results authority for Tier-2 `soc_percent` | FIELD-SOIL lock policy |
| O4 | Harmonization with **LC-NAT-STACK** mask (cropland vs grassland) | Zonal stats |

---

## 4. Pre-load QA

- [ ] Depth 0–30 cm documented in metadata  
- [ ] Units explicit (t/ha, t/km², or %)  
- [ ] Tier-2 rows with lab SOC reconciled sample count documented  
- [ ] Methods: interpolation / mapping model archived  

---

## 5. Load procedure

1. Register [`CORPUS_METADATA_REGISTER.md`](../CORPUS_METADATA_REGISTER.md).  
2. Import raster or national stock table.  
3. Populate `tier1_national.stock_tonnes` or `area_km2` in export builder P2.  
4. **F5 dry-run** — `gates.s12_f5.pass: true` when Tier-1 + Tier-2 gates met.

---

## 6. F5 pass model

| Gate | Criterion |
|------|-----------|
| Tier-2 partial (today) | `tier2_depth_0_30 > 0` |
| Tier-1 national (S12) | `tier1_national.stock_tonnes` or national stock metric not null |
| Production | Locked Tier-2 subset per verification policy |

---

## 7. Status

⬜ Awaiting delivery + **S12** — Tier-2 partial only; `source_layer_id: SOC-NAT-SURFACE`.