# Design — Verification lock policy v1 (draft)

**Status:** Draft for steering · **Replaces:** ad hoc “3 pilot rows” in demos  
**Annex:** E · **Pilot:** [`pilot/VERIFICATION_LOCK_PILOT.md`](../pilot/VERIFICATION_LOCK_PILOT.md)

---

## Purpose

Define **minimum locked field evidence** before `EXP-SO1-FIELD` is attested for PRAIS rehearsal — separate from **national raster** gates (F3–F5).

---

## Proposed policy table (EMA to confirm)

| Evidence | Minimum locked | Rationale | Steering ☐ |
|----------|----------------:|-----------|------------|
| LDN field | ___ / 150 | Intensive validation grid | |
| Soil Tier-2 | ___ / 632 | SO1-3 supporting | |
| Drylands ILUP | ___ / 16 | ILUP narrative if cited | |

**Pilot today:** LDN **3** locked (`npm run pilot:lock`) — demonstrates workflow only.

---

## Rules

1. Only `verification_status = locked` rows count toward minimum.  
2. `reporting_period` must be assigned before lock (reporting officer).  
3. Lock is **irreversible** for that period without supersede workflow.  
4. Dry-run gate F2 may warn below minimum; does not auto-fail until policy signed here.

**Config (draft):** `public/verification-lock-policy.json` · `GET /api/config/verification-lock-policy` · dry-run `gates.lock_policy`.

---

## Workspace behaviour (R2)

| Below minimum | At/above minimum |
|---------------|------------------|
| Reporting desk shows amber “policy gap” | Green for FIELD export attest |
| Bundle job allowed in **rehearsal** only | “Official” bundle requires officer tick |

---

## Sign-off

- [ ] Minimum LDN locked count agreed: ______  
- [ ] Soil / drylands minimums agreed or waived  
- [ ] Pilot script retired when real locks ≥ minimum  

*Linked:* [`R1_REPORTING_DESK_MODULE.md`](./R1_REPORTING_DESK_MODULE.md) · [`REPORTING_DESK_CHECKLIST.md`](../REPORTING_DESK_CHECKLIST.md) §B2