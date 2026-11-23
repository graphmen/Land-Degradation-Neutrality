# Programme session summary — 2026-11-23 (autonomous blocks)

**Platform:** National LDN Data Platform (not OAU dashboard reskin)  
**Discipline:** ~60 min blocks · `BLOCK_REVIEW_*.md` · push to `main`  
**Latest `main`:** through national overview field evidence (`2738b5b` session)

---

## Outcomes today (high level)

| Track | Delivered |
|-------|-----------|
| **Governance** | Verification lock pilot (3 LDN); S2 preflight + apply runbook; verify/queues APIs |
| **Corpus** | LC/LPD/SOC register (S10–S12); pressure **2804** + SBC **1364** staging; drylands ILUP **16** |
| **CEID / GIS** | Study (54 unmatched taxonomy); alias register; Q2 workshop pack + CSV; `npm run qc:ceid` |
| **Reporting** | §F dry-run gates; `GET /api/config/reporting-dry-run`; reporting + verification R2 **design** |
| **R1** | S1/S2 decision pack; IA + GIS + peer map; national overview + evidence registry APIs |
| **Mobile** | iOS UAT study; Android lane unchanged |
| **Steering** | DOCX batch (**16** docs); QC lineage; API demo script; `npm run qc:refresh` |

---

## R1 demo headline numbers (API)

| Metric | Source |
|--------|--------|
| Field evidence **798** (150 LDN · 632 soil · 16 drylands) | `GET /api/national-overview` → `field_evidence` |
| CEID match **93/147** (interim `second_segment`) | `GET /api/qc/summary` |
| Locked LDN pilot **3** | `GET /api/status` |
| Alias pending **54** | `GET /api/config/ceid-aliases` |
| §F gates F1/F2 pass; F3–F5 blocked S10–S12 | `GET /api/config/reporting-dry-run` |
| S2 Phase A+B files ready | `GET /api/config/s2-preflight` |

---

## Still blocked (honest)

| Blocker | ID |
|---------|-----|
| Government web shell | **R1** sign-off before **R2** |
| PostGIS polygon load | **Q1, Q2, S2** (+ CEID alias workshop) |
| SO1 national rasters | **S10–S12** file drop |
| Production lock scale | Verifier accounts + Supabase |
| iOS | Mac / TestFlight |

---

## Decisions to record in room

**S1, S2, S3–S4, S5, S6, S7, S8, S10, S11, S12** — see [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md)

**GIS add-on:** [`STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.md`](./STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.md)

---

## Run before R1 meeting

```powershell
npm run qc:refresh
npm run export:steering-docx
npm run export:ceid-worksheet
npm run dev
```

Walkthrough: [`R1_API_DEMO_SCRIPT.md`](./R1_API_DEMO_SCRIPT.md)

---

## Block review index (today — selective)

S2 preflight · S1/S2 pack · R2 reporting/verification design · reporting-dry-run API · CEID study · alias register · Q2 workshop · qc refresh · drylands ILUP · national overview field evidence (+ earlier: corpus, staging, lock pilot, GIS pack, evidence registry, verify queues).

**Next programme line:** Facilitate **R1** · **S1+S2** DBA apply · EMA raster delivery · Q2 CEID worksheet return.