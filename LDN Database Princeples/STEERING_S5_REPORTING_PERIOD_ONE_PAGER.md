# Steering — reporting period (S5)

**Duration:** 5 min · **Artefact:** `public/reporting-period-config.json` · **Annex:** E §E.4

---

## Proposed (draft — confirm in room)

| Field | Value |
|-------|-------|
| **Active reporting period** | `2020-2023` |
| **Baseline** | End **2015** (`t0_end_2015`) |
| **PRAIS due** | November **2026** (rehearsal) |
| **Status** | `draft_pending_ema_sign_off` |

---

## What signing S5 unlocks

| Unlocks | Still blocked |
|---------|----------------|
| Reporting desk period selector (R2) | Production lock without verifier process |
| Export `reporting_period` on packages | PostGIS national load (Q1/Q2) |
| Pilot lock narrative for **3** LDN rows | Full corpus lock policy |

**API:** `GET /api/config/reporting`

---

## Ask on the record

| ☐ | **S5 approved** — `2020-2023` is the active cycle for this rehearsal |
| ☐ | **S5 amended** — new period: _________________________ |
| ☐ | **S5 deferred** — reporting officer absent |

After sign-off: set `status` to `approved` in JSON (git commit or future DB config table).

---

*Linked:* [`REPORTING_DESK_CHECKLIST.md`](./REPORTING_DESK_CHECKLIST.md) §A2