# Steering pack — reference data & Supabase (one room, ~12 min)

**Print / project at R1** · **DBA executes after both S1 + S2 approved** · **No pressure PostGIS (`003`) until S8**

---

## A. S1 — Annex F code lists v1.0

| Topic | Evidence | Notes |
|-------|----------|-------|
| Source JSON | `reference-code-lists.v0.9.json` | Mobile bundles + `/api/reference-code-lists` |
| SQL seed | `backend/migrations/001_reference_code_lists_seed.sql` | Applied in **Phase A** (S2) |
| Mobile alignment | Phase 3.6 ✅ | LDN, soil, drylands labels from lists |
| ETL denorm | `land_cover` / `land_use` on 150 LDN rows | Exports use codes, not free text |

**Ask on the record:**

| ☐ | Decision |
|---|----------|
| ☐ | **S1 approved** — lists are authoritative for mobile + PRAIS exports until v1.1 change control |
| ☐ | **S1 deferred** — document gaps: _________________________________ |

**Escalation:** any open label disputes → Annex F workshop, not ad-hoc dashboard edits.

---

## B. S2 — Supabase Phase A + B (governance first)

| Phase | Files | Steering gate |
|-------|-------|---------------|
| **A** | `001_reference_code_lists.sql`, `001_reference_code_lists_seed.sql` | **S1** |
| **B** | `004_field_governance.sql`, `005_verification_log.sql` | **S1** |
| **C** | `002_national_ldn_units.sql` | **S3–S4** (Q1/Q2) |
| **D** | `003_pressure_layers.sql` | **S8** |

**Local preflight (reproducibility):**

```powershell
npm run s2:preflight
```

| API | Purpose |
|-----|---------|
| `GET /api/config/s2-preflight` | `phase_ab_ready`, per-file `sha256` for minutes |
| `GET /api/status` | Programme route list includes s2-preflight |

**Ask on the record:**

| ☐ | Decision |
|---|----------|
| ☐ | **S2 approved** — DBA may run Phase A then B in Supabase SQL editor |
| ☐ | **S2 deferred** — reason: _________________________________ |

**After apply (same week):**

1. `backend/VERIFY_MIGRATIONS.sql` — sections 001, 004, 005  
2. `node scripts/verify_supabase_schema.mjs` (with project env)  
3. Record commit SHA + preflight `sha256` in steering minutes  

**Runbook:** [`SUPABASE_S2_STEERING_RUNBOOK.md`](../backend/SUPABASE_S2_STEERING_RUNBOOK.md) · [`S2_APPLY_PREFLIGHT.md`](../backend/S2_APPLY_PREFLIGHT.md)

---

## C. What does **not** happen if only S2 passes

| Blocked | Until |
|---------|-------|
| National polygon PostGIS load | S3–S4 |
| Pressure point PostGIS load | S8 |
| R2 government web shell | **S6 / R1 §9** |
| F3/F4/F5 national rasters in bundle | S10–S12 + files in `important files/` |

---

## D. Minute template (paste)

```
S1 Code lists v1.0: [APPROVED / DEFERRED] — chair __________ date ______
S2 Supabase A+B:   [APPROVED / DEFERRED] — chair __________ date ______
Preflight sha256 (001_reference_code_lists.sql): _______________________
DBA owner for SQL editor: _______________________
```

*Facilitation:* optional slot **12–24** in [`R1_STEERING_SIGN_OFF_PACK.md`](./R1_STEERING_SIGN_OFF_PACK.md) if GIS segment runs long — can pair with DBA offline.