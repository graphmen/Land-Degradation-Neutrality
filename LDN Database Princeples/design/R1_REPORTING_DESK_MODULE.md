# Design — Reporting desk module (R1 §7)

**Status:** v0.1 · **Implements:** R2 route `/reporting-desk` · **No OAU dashboard patches**

**Parent:** [`R1_INFORMATION_ARCHITECTURE.md`](../R1_INFORMATION_ARCHITECTURE.md) §7 · Checklist: [`REPORTING_DESK_CHECKLIST.md`](../REPORTING_DESK_CHECKLIST.md)

---

## 1. Purpose

Single government-facing surface for **SO1 rehearsal**, **§F export gates**, and **PRAIS handoff** — not KPI tiles on the home page.

| User | Goal |
|------|------|
| National reporting officer | See what can ship to PRAIS today vs blocked |
| GIS lead | See which national layers block F3/F4/F5 |
| Steering | Read-only summary before sign-off |

---

## 2. Wireframe — main screen

```
┌──────────────────────────────────────────────────────────────────────┐
│ Reporting desk          Period: [2020-2023 ▼]   Officer: [name]      │
├──────────────────────────────────────────────────────────────────────┤
│ §F gates (Annex E)              │ Locked field evidence              │
│  F1 EXP-META     [PASS] 13 lyr  │  LDN locked: 3 (pilot)             │
│  F2 EXP-SO1-FIELD [PASS]        │  Policy minimum: ___ (steering)    │
│  F3 EXP-SO1-LC  [BLOCK S10]     │  [Open verification › locked]      │
│  F4 EXP-SO1-LPD [BLOCK S11]     │                                    │
│  F5 EXP-SO1-SOC [BLOCK S12]     │                                    │
├─────────────────────────────────┴────────────────────────────────────┤
│ Export jobs (rehearsal)                                              │
│  [EXP-META] [FIELD] [STATUS] [LC] [LPD] [SOC] [Bundle] [Photos]      │
│  Last run: timestamp · package hash · officer id                     │
├──────────────────────────────────────────────────────────────────────┤
│ Checklist A–G (from REPORTING_DESK_CHECKLIST) — collapsible sections │
│  Stepping progress: A governance · B corpus · C PRAIS map · …        │
└──────────────────────────────────────────────────────────────────────┘
```

**Tone:** Checklist and hashes — not “success rate” charts.

---

## 3. Data bindings (R2 — existing today)

| UI zone | Interim API / artefact | Refresh |
|---------|------------------------|---------|
| §F gates | `GET /api/config/reporting-dry-run` · `public/reporting-desk-dry-run.json` | `npm run reporting:dry-run` |
| Locked counts | `GET /api/national-overview` → `verification.locked_count` | dynamic |
| Corpus counts | `GET /api/qc/summary` | `npm run qc:summary` |
| Layer register | `GET /api/export/meta` | dynamic |
| Steering blockers | `GET /api/national-overview` → `reporting_desk.steering_blockers` | dynamic |

---

## 4. Export job panel

| Job | Route / script | Gate before “production” |
|-----|----------------|-------------------------|
| EXP-META | `GET /api/export/meta` | F1 pass |
| EXP-SO1-FIELD | `GET /api/export/so1-field` | F2 + locked policy |
| EXP-SO1-STATUS | `GET /api/export/so1-status` | 1OAO method signed |
| EXP-SO1-LC/LPD/SOC | export routes + templates | F3/F4/F5 |
| Bundle | `GET /api/export/bundle` | All selected jobs |
| Photos | `GET /api/export/photos` | Locked LDN |

**UI behaviour:** Run rehearsal → show CSV/JSON hash in panel → officer attests in audit log (future `reporting_handoff` table).

---

## 5. RBAC

| Role | Reporting desk |
|------|----------------|
| National reporting officer | Full — run exports, assign period, attest handoff |
| GIS lead | Read §F + corpus B rows; no export attest |
| District verifier | No access (use Verification workspace) |
| Steering | Read-only gate summary |
| Public | No access |

---

## 6. Empty / blocked states (copy)

| Condition | Message |
|-----------|---------|
| F3 blocked | “National land-cover stack not delivered — steering **S10**.” |
| F4 blocked | “LPD national raster — steering **S11**.” |
| F5 blocked | “SOC Tier-1 surface — steering **S12**; Tier-2 cores listed separately.” |
| Zero locked | “No PRAIS-eligible field rows — complete verification workflow.” |

---

## 7. R2 route map

| Path | Component |
|------|-----------|
| `/reporting-desk` | Main layout §2 |
| `/reporting-desk/checklist` | Full A–G from markdown checklist (rendered) |
| `/reporting-desk/exports` | Job history (v1: local manifest files) |

**Deep links from National overview:** `steering_actions` already points to `/api/qc/summary` and dry-run — R2 uses human routes above.

---

## 8. Sign-off hooks (R1 §9)

Steering confirms:

- [ ] Reporting desk is **the** SO1 rehearsal entry (not legacy dashboard)
- [ ] §F gates visible before any “export all” action
- [ ] F3/F4/F5 blocked messaging matches **S10–S12** queue

*Related gates:* [`REPORTING_DESK_F3_S10_GATE.md`](./REPORTING_DESK_F3_S10_GATE.md)