# R1 — Chair run of show (facilitation)

**Duration:** 60–75 min · **Goal:** §9 signed or explicit defer list · **No legacy dashboard demo**

**Co-chair packs:** [`R1_STEERING_SIGN_OFF_PACK.md`](./R1_STEERING_SIGN_OFF_PACK.md) · [`STEERING_MEETING_QUICK_BRIEF.md`](./STEERING_MEETING_QUICK_BRIEF.md)

---

## Night-before / room setup (10 min)

```powershell
npm run qc:refresh
npm run export:steering-docx
npm run export:ceid-worksheet
npm run dev
# separate terminal after dev is up:
npm run r1:smoke
```

| At table | Path |
|----------|------|
| Word pack (17+ DOCX) | `exports/steering-docx/` |
| CEID Excel handout | `exports/steering-docx/CEID_ALIAS_WORKSHOP.csv` |
| Browser | `http://localhost:3000` (API only — not home dashboard) |

---

## Minute-by-minute

| Min | Segment | Chair says | Decision IDs |
|-----|---------|------------|--------------|
| 0–8 | Opening | “National LDN **data platform** — corpus first, not KPI dashboard.” | — |
| 8–15 | Twins | Botswana grid + Panama platform; CEID discipline [`STUDY_CEID_GRID_PEER_BENCHMARK.md`](./STUDY_CEID_GRID_PEER_BENCHMARK.md) | **S7** |
| 15–22 | Data governance | Code lists v1.0; Supabase Phase A+B preflight | **S1, S2** |
| 20–22 | Reporting period | [`STEERING_S5_REPORTING_PERIOD_ONE_PAGER.md`](./STEERING_S5_REPORTING_PERIOD_ONE_PAGER.md) | **S5** |
| 22–32 | GIS | Q1/Q2; raster study [`STUDY_SO1_NATIONAL_RASTER_DELIVERY.md`](./STUDY_SO1_NATIONAL_RASTER_DELIVERY.md); CEID workshop | **S3, S4, S10–S12** |
| 32–44 | **Live API** | Run [`R1_API_DEMO_SCRIPT.md`](./R1_API_DEMO_SCRIPT.md) steps **1–7, 10–11** (skip pressure/interventions if time) | — |
| 44–52 | IA wireframes | Evidence, verification queues, reporting desk — names only | **S6** |
| 52–58 | Cutover + RBAC | §8 redirects; district vs national roles | — |
| 58–65 | §9 sign | Go / no-go **R2** government shell | **R1** |

---

## API demo (speak track — condensed)

| Step | URL | One line |
|------|-----|----------|
| 1 | `/api/status` | Programme route list + **3** locked pilot |
| 2 | `/api/national-overview` | **798** field rows headline |
| 3 | `/api/qc/summary` | 254k polygons, CEID **93/147** |
| 6 | `/api/evidence/summary` | Verification histogram |
| 6b | `/api/evidence/registry?prais_eligible=true` | PRAIS-eligible only |
| 5 + 5b | `/api/validator/ceid` grid vs `ZC2` | Q2 story |
| 10–11 | `/api/config/s2-preflight` · `reporting-dry-run` | DBA + reporting officer gates |

---

## Decision capture (minute keepers)

| ID | Ask | Record |
|----|-----|--------|
| S1 | Code lists approved? | ☐ Yes / defer |
| S2 | DBA may run Phase A+B? | ☐ Yes / defer |
| S3–S4 | Q1 unit + Q2 CEID rule | Notes: ______ |
| S5 | Reporting period | ______ |
| S6 | Module map accepted? | ☐ |
| S7 | Twins Botswana + Panama? | ☐ |
| S8–S12 | Pressure + rasters | Defer OK with date |
| R1 §9 | Authorize R2 shell build? | ☐ Go / no-go |

Update [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md) before adjourn.  
**Minutes:** fill [`STEERING_MINUTES_TEMPLATE_R1.md`](./STEERING_MINUTES_TEMPLATE_R1.md) → save as `STEERING_MINUTES_R1_YYYY-MM-DD.md`.

---

## If time runs short

1. **Keep:** S1/S2, Q2 CEID one-pager, §9.  
2. **Defer:** Pressure API demo, interventions map, full GIS raster debate.  
3. **Never demo:** OAU home dashboard as product.

---

## After meeting (same week)

| If approved | Action |
|-------------|--------|
| S2 | DBA: [`SUPABASE_S2_STEERING_RUNBOOK.md`](../backend/SUPABASE_S2_STEERING_RUNBOOK.md) |
| Q2 | GIS returns CSV → `npm run import:ceid-aliases` |
| R1 §9 go | Programme authorizes **R2** implementation sprint |