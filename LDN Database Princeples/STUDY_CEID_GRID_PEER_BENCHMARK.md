# Study — CEID grid discipline vs peer twins (S7 + Q2)

**Block type:** Study · **Date:** 2026-11-23  
**Use at R1:** Pair with [`STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.md`](./STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.md) and [`STEERING_PEER_TWINNING_RECOMMENDATION.md`](./STEERING_PEER_TWINNING_RECOMMENDATION.md)

---

## Zimbabwe finding (evidence-based)

| Fact | Implication |
|------|-------------|
| **93/147** unique CEIDs match national `Id` via `second_segment` | Grid-style IDs are already the majority discipline |
| **54** unmatched = **ZC/ZE tokens + named sites** only | Not a broken join rule — **naming regime coexistence** |
| **254k** polygons / **43k** unique `Id` | Same pattern as dense national grids — aggregation policy (**Q3**) matters |

---

## Botswana (technical twin) — what to adopt

| Botswana practice | Zimbabwe action |
|-------------------|-----------------|
| Stable plot / unit ID on national grid | **Sign Q2a** — `second_segment` for `ward_point` |
| TWG governs ID changes | Alias register owner + git-reviewed JSON (→ future DB **006**) |
| Ground truthing cadence | Verification workspace before lock — already in R1 IA |

**Do not copy:** outsourcing national corpus to external studio only — ZW hosts **EMA infrastructure**.

---

## Panama (institutional twin) — what to adopt

| Panama practice | Zimbabwe action |
|-------------------|-----------------|
| Ministry-owned monitoring platform post-project | **S6 / R1** — government shell, not OAU dashboard |
| Basin/farm traceability in reports | CEID alias table documents **legacy campaign** names for audit |
| Local LDN goal reports | District narrative can cite **resolved** aliases, not silent drops |

---

## Kenya (anti-pattern) — what to avoid

Kenya-style **multiple concurrent ID vocabularies** without a register is exactly the **54-token** risk. Workshop outcome must be: **map, retire, or exclude** — not ignore.

---

## Steering synthesis (proposed minute text)

> Zimbabwe adopts **Botswana grid discipline** for numeric CEIDs and **Panama institutional ownership** of the alias register. **Kenya fragmentation** is rejected: all legacy tokens are accounted for in `reference-ceid-aliases.v0.1.json` before PostGIS load.

---

## Twinning Q1 desk exchange (suggested ask)

| Question to Botswana | Question to Panama |
|----------------------|-------------------|
| How are non-grid plot codes handled in PRAIS QA? | How does ministry keep plot alias tables after GEF? |

*Parent:* [`CEID_UNMATCHED_STUDY.md`](./corpus/metadata/CEID_UNMATCHED_STUDY.md) · [`R1_PEER_TWINNING_IA_MAP.md`](./R1_PEER_TWINNING_IA_MAP.md)