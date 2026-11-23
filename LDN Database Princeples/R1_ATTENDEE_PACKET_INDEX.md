# R1 attendee packet — index (one page)

**Meeting:** National LDN platform sign-off · **Print or email this page**

---

## Pre-flight (ICT — day before)

```powershell
npm run r1:preflight
npm run dev
npm run r1:smoke
```

(`r1:preflight` = QC refresh + Word pack + CEID CSV)

---

## Who brings what

| Role | Pack |
|------|------|
| **Chair** | [`R1_CHAIR_RUN_OF_SHOW.md`](./R1_CHAIR_RUN_OF_SHOW.md) · [`R1_API_DEMO_SCRIPT.md`](./R1_API_DEMO_SCRIPT.md) |
| **Minute taker** | [`STEERING_MINUTES_TEMPLATE_R1.md`](./STEERING_MINUTES_TEMPLATE_R1.md) |
| **DBA** | `SUPABASE_S2_STEERING_RUNBOOK.docx` · `S2_APPLY_PREFLIGHT.docx` |
| **GIS** | `STEERING_GIS_SO1_DECISION_PACK.docx` · `CEID_*` · `CEID_ALIAS_WORKSHOP.csv` |
| **Reporting officer** | `STEERING_S5_*` · `VERIFICATION_LOCK_POLICY_V1.docx` · reporting dry-run demo |
| **All** | `EMA_STEERING_ONE_PAGER.docx` · `STEERING_DECISIONS_QUEUE.docx` |

**Folder:** `exports/steering-docx/` (gitignored — regenerate before print)

---

## Core markdown (repo — always current)

| Topic | File |
|-------|------|
| Sign-off §9 | `R1_STEERING_SIGN_OFF_PACK.md` |
| IA / modules | `R1_INFORMATION_ARCHITECTURE.md` |
| After meeting | `R1_POST_MEETING_PLAYBOOK.md` |
| Decisions log | `STEERING_DECISIONS_QUEUE.md` |
| Day summary | `PROGRAMME_SESSION_SUMMARY_2026-11-23.md` |

---

## Live demo URLs (localhost or national host)

| Call | Purpose |
|------|---------|
| `/api/national-overview` | **798** field evidence headline |
| `/api/evidence/summary` | Verification histogram |
| `/api/config/reporting-dry-run` | §F + lock policy |
| `/api/config/s2-preflight` | DBA Phase A+B |

**Do not demo** legacy dashboard home as the product.

---

## Outcomes to record

**S1–S12** · **Q1/Q2** · **R1 §9 Go/no-go** → minutes file + update `STEERING_DECISIONS_QUEUE.md`