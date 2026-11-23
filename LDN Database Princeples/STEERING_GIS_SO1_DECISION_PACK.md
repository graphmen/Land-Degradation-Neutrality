# Steering pack — GIS & SO1 national inputs (one room, ~15 min)

**Print / project at R1** · **Does not replace** layer import plans · **No PostGIS load until gates below**

---

## A. Polygon foundation (before rasters)

| ID | Decision | Status | Evidence |
|----|----------|--------|----------|
| **Q1** | `Area` field unit on LDN-NAT-ALL | ⬜ | [`CEID_JOIN_QC.md`](./corpus/metadata/CEID_JOIN_QC.md) |
| **Q2** | CEID ↔ shapefile `Id` (93/147 interim) | ⬜ | [`CEID_VALIDATOR_API.md`](./corpus/metadata/CEID_VALIDATOR_API.md) · Study: [`CEID_UNMATCHED_STUDY.md`](./corpus/metadata/CEID_UNMATCHED_STUDY.md) |
| **S3–S4** | Load **002** + polygons | Blocked on Q1–Q2 | [`LDN-NAT-ALL_IMPORT_PLAN.md`](./corpus/metadata/LDN-NAT-ALL_IMPORT_PLAN.md) |

**Ask:** GIS lead states **Area unit** and **CEID rule** on the record.

**Q2 workshop:** [`STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.md`](./STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.md) · Excel: `npm run export:ceid-worksheet`

**Pressure (S8):** [`STEERING_S8_PRESSURE_ONE_PAGER.md`](./STEERING_S8_PRESSURE_ONE_PAGER.md)

---

## B. SO1 national raster trilogy (delivery → F3/F4/F5)

| ID | Layer | F step | Deliver to `important files/` | Steering question |
|----|-------|--------|-------------------------------|-------------------|
| **S10** | **LC-NAT-STACK** (t₀ + t₁) | F3 | `lc-national-t0.tif`, `lc-national-t1.tif` | T1: Trends.Earth vs EMA national LC |
| **S11** | **LPD-NAT-RASTER** | F4 | `lpd-national.tif` (or zonal CSV) | L1–L4: VI source, years, legend |
| **S12** | **SOC-NAT-SURFACE** (0–30 cm) | F5 | `soc-national-0-30.tif` or stock table | O1–O4: stock vs %, lab Tier-2 |

**Dry-run gates:** `public/reporting-desk-dry-run.json` → `s10_f3`, `s11_f4`, `s12_f5`.

**Delivery study:** [`STUDY_SO1_NATIONAL_RASTER_DELIVERY.md`](./STUDY_SO1_NATIONAL_RASTER_DELIVERY.md)

**Local QC (no rasters yet):**

```powershell
python scripts/national_raster_qc.py --checklist-only
# After delivery:
python scripts/national_raster_qc.py
```

---

## C. What rehearsal can claim today (honest)

| Package | Can rehearse? | Why |
|---------|---------------|-----|
| EXP-META | ✅ 13 layers registered | Corpus manifest |
| EXP-SO1-FIELD | ✅ | 150 LDN + soil |
| EXP-SO1-LC/LPD | 🔶 template | Await S10/S11 + files |
| EXP-SO1-SOC | 🔶 Tier-2 only | 632 cores; Tier-1 awaits S12 |
| EXP-SO1-STATUS | 🔶 LD % only | **1OAO** needs B |
| Lock pilot | ✅ 3 rows | Scale after R1 + S2 |

---

## D. Checkboxes (minute taker)

| ☐ | Decision recorded |
|---|---------------------|
| | Q1 Area unit = __________ |
| | Q2 CEID rule = __________ (or workshop date) |
| | S10 T1 = A / B / C |
| | S11 LPD source = A / B / C |
| | S12 SOC Tier-1 = A / B / C |
| | EMA commits file drop date = __________ |
| | S2 Phase A+B scheduled (code lists + governance) |

---

## E. QC lineage (optional handout)

[`corpus/CORPUS_QC_LINEAGE.md`](./corpus/CORPUS_QC_LINEAGE.md) · `GET /api/qc/summary`

## F. Attachments for this segment

- [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md)  
- [`REPORTING_DESK_CHECKLIST.md`](./REPORTING_DESK_CHECKLIST.md) §B0–B0c, §F  
- [`backend/SUPABASE_S2_STEERING_RUNBOOK.md`](../backend/SUPABASE_S2_STEERING_RUNBOOK.md) (after S1)

*Facilitation:* slot **18–30** in [`R1_STEERING_SIGN_OFF_PACK.md`](./R1_STEERING_SIGN_OFF_PACK.md) — GIS segment optional if Q1/Q2 deferred to workshop.