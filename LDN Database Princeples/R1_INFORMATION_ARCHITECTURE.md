# R1 — Government information architecture (Design draft)

**Block type:** Design · **Status:** Draft for steering sign-off — **no implementation** until signed  
**Version:** 0.1 · **Date:** 2026-11-23  
**Replaces (eventually):** OAU sidebar: Dashboard, LDN Monitoring, Database Explorer, etc.

---

## 1. Design principles (from Guide §1.3)

1. **Corpus-first** — every screen ties to [`NATIONAL_DATA_CORPUS.md`](./NATIONAL_DATA_CORPUS.md) layer.  
2. **Evidence before maps** — registry and verification default; maps are views on governed data.  
3. **Period + tier visible** — no anonymous numbers.  
4. **Reporting eligibility explicit** — only `locked` records feed export jobs.  
5. **EMA language** — module names suitable for ministerial briefings.

---

## 2. Roles (RBAC target)

| Role | Modules (read) | Modules (write) |
|------|----------------|------------------|
| **Public / donor** | National overview (aggregates only) | — |
| **Enumerator** | — | (mobile app only) |
| **District verifier** | Evidence registry (district), Verification workspace | Approve / reject → district_review |
| **National reporting officer** | All except Admin | Assign period, lock, export, PRAIS handoff |
| **GIS lead** | Layers, LDN units, Productivity & SOC | Layer catalogue, import metadata |
| **ICT / DBA** | Administration | Migrations, code lists, users |
| **Steering** | National overview, Reporting desk summary | Policy flags (read-only sign-off views) |

---

## 3. Primary navigation (government labels)

```
EMA National LDN Platform
├── National overview          ← landing (not "Dashboard")
├── Evidence registry          ← field LDN, soil, drylands (unified table)
├── Verification workspace     ← queues by state
├── National layers
│   ├── LDN units (254k)
│   ├── Interventions & programmes
│   ├── Pressures (mining, invasives, SBC)
│   └── Monitoring network
├── Analytics (SO1)
│   ├── Land cover & transitions
│   ├── Land productivity (LPD)
│   └── Soil organic carbon
├── Drylands (ILUP)
├── Reporting desk             ← EXP-SO1-*, PRAIS rehearsal
└── Administration
```

---

## 4. Wireframe — National overview (landing)

```
┌──────────────────────────────────────────────────────────────────┐
│ [EMA crest]  National LDN Platform     Period: [2022-2025 ▼]   │
├──────────────────────────────────────────────────────────────────┤
│ SO1 headline (15.3.1 %)     │ Reporting deadline: Nov 2026      │
│ Tier mix chart              │ Verification backlog: N records   │
├─────────────────────────────┴──────────────────────────────────┤
│ Corpus health: field | national layers | reference | exports   │
│  (counts + last import version — not vanity KPIs)               │
├─────────────────────────────────────────────────────────────────┤
│ Steering actions: [Open verification queue] [Reporting desk]    │
└─────────────────────────────────────────────────────────────────┘
```

**Retired from landing:** LDN target progress cards, “Surveyed Nodes”, developer telemetry tone.

---

## 5. Wireframe — Evidence registry

Single searchable registry — **three form types, one governance model**.

| Column | Source |
|--------|--------|
| ID / UUID | mobile `submission_id` |
| Type | LDN \| Soil \| Drylands |
| District / ward | admin |
| CEID (if LDN) | link to unit layer |
| Collected at | timestamp |
| Tier | field_verify / tier2_national |
| Verification status | state machine |
| Code list version | Annex F |
| Reporting period | nullable until assigned |
| PRAIS eligible? | computed: `locked` only |

**Actions:** View detail · Open on map · Send to verification · (no inline Kobo sync)

---

## 6. Verification state machine

```
draft → submitted → district_review → national_review → approved → locked
                                              ↘ rejected → superseded
```

| State | Who acts | Platform behaviour |
|-------|----------|-------------------|
| `submitted` | System | From `/api/submit/*` |
| `district_review` | District verifier | Notes required |
| `national_review` | Reporting officer | Tier check |
| `approved` | Reporting officer | Ready for period assignment |
| `locked` | Reporting officer | Immutable for PRAIS export |
| `rejected` | Verifier | Reason code + optional resubmit |

---

## 7. Wireframe — Reporting desk

```
┌─────────────────────────────────────────────────────────┐
│ Reporting desk — SO1 rehearsal                          │
├─────────────────────────────────────────────────────────┤
│ Checklist (Annex E)          [ ] SO1-1 tables ready     │
│                              [ ] Metadata Annex II     │
│                              [ ] Locked evidence count   │
├─────────────────────────────────────────────────────────┤
│ Export jobs: EXP-SO1-LC | EXP-SO1-LPD | EXP-SO1-SOC   │
│ Last PRAIS handoff: date / officer / package hash      │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Route migration (cutover map)

| Old OAU route | New module (Phase R3) | Interim |
|---------------|----------------------|---------|
| `/` | `/national-overview` | Keep `/` redirect after cutover |
| `/database` | `/evidence/registry` | Deprecation banner |
| `/ldn` | `/evidence/registry?type=ldn` + map panel | Read-only |
| `/soil` | `/evidence/registry?type=soil` | Read-only |
| `/drylands` | `/drylands` (ILUP module) | Keep content |
| `/interventions` | `/layers/interventions` | Already has EMA merge |
| `/gallery` | Evidence detail attachments | Lower priority |

**Kobo backfill:** Administration → legacy import (not main nav).

---

## 9. Sign-off checklist (steering)

- [ ] Module names acceptable for government  
- [ ] Landing = National overview (not dashboard KPIs)  
- [ ] Evidence registry = single front door for field data  
- [ ] Verification states match EMA workflow  
- [ ] **Then** authorize R2 implementation (new Next.js shell or parallel app)

---

*Previous block:* [Study peer twinning](./BLOCK_REVIEW_2026-11-23_study-peer-twinning.md) · *Blueprint:* [§4 modules](./INTERNATIONAL_LDN_BENCHMARK_AND_ZIMBABWE_BLUEPRINT.md)