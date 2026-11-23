# Design — Verification workspace module (R1 §6)

**Status:** v0.1 · **Implements:** R2 route `/verification` · **No OAU chrome**

**Parent:** [`R1_INFORMATION_ARCHITECTURE.md`](../R1_INFORMATION_ARCHITECTURE.md) §6 · Spec: [`VERIFICATION_WORKSPACE_SPEC.md`](../VERIFICATION_WORKSPACE_SPEC.md)

---

## 1. Purpose

Operational UI for **district → national → lock** — complements Evidence registry (search) with **queue-first** worklists.

---

## 2. Wireframe — queue hub

```
┌──────────────────────────────────────────────────────────────────────┐
│ Verification workspace                    District: [all ▼]          │
├──────────────────────────────────────────────────────────────────────┤
│ Queue        │ Count │ Actor                    │ Action              │
│ Submitted    │  n    │ District verifier        │ [Work queue ›]      │
│ District     │  n    │ National officer         │ [Work queue ›]      │
│ National     │  n    │ Reporting officer        │ [Work queue ›]      │
│ Approved     │  n    │ Reporting officer        │ [Assign period]     │
│ Locked       │  3    │ Read-only / export       │ [View PRAIS rows]     │
│ Rejected     │  n    │ District or national     │ [Review reasons]      │
├──────────────────────────────────────────────────────────────────────┤
│ Selected queue: Submitted (sample)                                    │
│ ┌────┬────────┬──────────┬─────────┬──────────────┬──────────────┐  │
│ │ ID │ Type   │ District │ CEID    │ Collected    │ Status       │  │
│ └────┴────────┴──────────┴─────────┴──────────────┴──────────────┘  │
│ [Open detail] [Transition ▼]  (no inline field edit)                 │
└──────────────────────────────────────────────────────────────────────┘
```

**National overview link:** backlog tile deep-links to `?queue=submitted`.

---

## 3. Record detail drawer

Minimum fields per [`VERIFICATION_WORKSPACE_SPEC.md`](../VERIFICATION_WORKSPACE_SPEC.md):

| Section | Content |
|---------|---------|
| Header | Evidence type, `record_id`, current status |
| Location | District/ward, CEID, map thumbnail |
| Governance | Tier, code list version, reporting period |
| Evidence | Photos, attachments, accuracy |
| Context | National unit join (if Q2 resolved); pressure flags optional |
| Audit | `verification_log` rows (after S2 **005**) |

**Actions (footer):** state transitions via `POST /api/verify/transition` with required notes.

---

## 4. Data bindings

| UI | API |
|----|-----|
| Queue counts | `GET /api/verify/queues` |
| Worklist rows | `GET /api/verify/queues?queue={name}&limit=50` |
| Row shape (search) | `GET /api/evidence/registry?verification_status=…` |
| Transition | `POST /api/verify/transition` |
| Pilot locked demo | `GET /api/verify/queues?queue=locked` |

**Flag:** `ENABLE_VERIFICATION_QUEUES_API=false` → module shows maintenance + doc link.

---

## 5. RBAC matrix

| Action | District verifier | National officer | Reporting officer |
|--------|-------------------|------------------|-------------------|
| View submitted / district queues | ✓ (own district) | ✓ | ✓ |
| district_review → national_review | — | ✓ | ✓ |
| national_review → approved | — | — | ✓ |
| approved → locked | — | — | ✓ |
| Reject | ✓ (with reason) | ✓ | ✓ |
| Bulk approve | — | — | Policy TBD (non-goal v1) |

---

## 6. Integration with Evidence registry

| From | To |
|------|-----|
| Registry row “Send to verification” | Opens drawer in workspace pre-filtered |
| Workspace “Search all evidence” | Link to `/evidence/registry` with same filters |

Single governance model — two views (search vs queues).

---

## 7. R2 route map

| Path | Notes |
|------|-------|
| `/verification` | Queue hub §2 |
| `/verification/queues/[name]` | Deep link from national overview |
| `/verification/records/[id]` | Drawer or full page |

**Retired:** OAU “database explorer” approval flows — banner points here after R3.

---

## 8. Sign-off hooks (R1 §9)

- [ ] Queue names match Annex E states
- [ ] Lock action requires reporting period assignment
- [ ] No field-value edit in workspace (mobile resubmit only)