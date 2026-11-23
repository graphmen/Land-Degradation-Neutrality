# Programme session summary — 2026-11-23 (autonomous blocks)

**Platform:** National LDN Data Platform (not OAU dashboard reskin)  
**Discipline:** ~60 min blocks · `BLOCK_REVIEW_*.md` · push to `main`

---

## Outcomes today (high level)

| Track | Delivered |
|-------|-----------|
| **Governance** | Verification lock pilot (3 LDN); S2 runbook; verify/queues APIs |
| **Corpus** | LC/LPD/SOC register (S10–S12); pressure **2804** + SBC **1364** staging |
| **Reporting** | §F dry-run gates; F3/F4/F5 design; bundle + photos path |
| **R1** | IA pack, GIS decision pack, peer IA map, national layers + evidence registry **API previews** |
| **Mobile** | iOS UAT study; Android lane unchanged |
| **Steering** | DOCX export batch; QC lineage index; API demo script |

---

## Still blocked (honest)

| Blocker | ID |
|---------|-----|
| Government web shell | **R1** sign-off before **R2** |
| PostGIS polygon load | **Q1, Q2, S2** |
| SO1 national rasters | **S10–S12** file drop |
| Production lock scale | Verifier accounts + Supabase |
| iOS | Mac / TestFlight |

---

## Decisions to record in room

**S1, S2, S3–S4, S5, S6, S7, S8, S10, S11, S12** — see [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md)

---

## Run before next meeting

```powershell
npm run qc:summary
npm run reporting:dry-run
npm run export:steering-docx
```

---

## Block review index (today)

`BLOCK_REVIEW_2026-11-23_*` — verification lock, S2 steering, LC/LPD/SOC data, GIS pack, pressure/SBC staging, mobile iOS, national layers design, corpus QC, national overview, evidence registry, verify queues (see repo folder).

**Next programme line:** R1 meeting · S2 apply · EMA raster delivery.