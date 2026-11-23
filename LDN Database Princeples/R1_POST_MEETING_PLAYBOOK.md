# R1 — Post-meeting playbook

**Use after** [`STEERING_MINUTES_TEMPLATE_R1.md`](./STEERING_MINUTES_TEMPLATE_R1.md) is filled · **No code until paths below say so**

---

## 0. Always (any outcome)

| Step | Command / artefact |
|------|-------------------|
| Archive minutes | `STEERING_MINUTES_R1_YYYY-MM-DD.md` in repo or EMA records |
| Refresh QC | `npm run qc:refresh` |
| Push decision notes | Update [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md) |

---

## A. R2 **Go** (§9 signed)

| Step | Owner | Action |
|------|-------|--------|
| A1 | Programme | `PROGRAMME_EXECUTION_STEPS.md` — R1 → ✅ |
| A2 | ICT | Authorize R2 sprint per module map [`R1_INFORMATION_ARCHITECTURE.md`](./R1_INFORMATION_ARCHITECTURE.md) |
| A3 | DBA | If **S2** approved: Phase A+B [`SUPABASE_S2_STEERING_RUNBOOK.md`](../backend/SUPABASE_S2_STEERING_RUNBOOK.md) |
| A4 | GIS | If **Q2** approved: CSV → `npm run import:ceid-aliases` |
| A5 | Reporting | If **S5** approved: set `reporting-period-config.json` `status: approved` |
| A6 | Reporting | Agree lock minimums [`design/VERIFICATION_LOCK_POLICY_V1.md`](./design/VERIFICATION_LOCK_POLICY_V1.md) |

**Do not:** ship OAU dashboard reskin as “R2 complete.”

---

## B. R2 **No-go** or **Conditional**

| Step | Action |
|------|--------|
| B1 | List blockers in minutes — defer **R2** only; APIs/mobile/data continue |
| B2 | Conditional: document “allowed Build” list (e.g. S2 only, no shell) |
| B3 | Reconvene with unresolved **S10–S12** / **Q1** dates |

---

## C. Decisions without R2 (common)

| If approved | Next block |
|-------------|------------|
| **S1+S2** only | DBA sprint — verify schema script with env · [`STUDY_POSTGIS_READINESS_CHECKLIST.md`](./STUDY_POSTGIS_READINESS_CHECKLIST.md) |
| **Q2** only | Alias import + re-`qc:ceid` |
| **S10–S12** deferred | Track in [`STUDY_SO1_NATIONAL_RASTER_DELIVERY.md`](./STUDY_SO1_NATIONAL_RASTER_DELIVERY.md) |

---

## D. Demo artefacts to retire

When production locks exist:

```powershell
npm run pilot:lock -- --revert
```

Replace pilot narrative in demos with real `locked_count` from `GET /api/evidence/summary`.

---

*Chair:* [`R1_CHAIR_RUN_OF_SHOW.md`](./R1_CHAIR_RUN_OF_SHOW.md)