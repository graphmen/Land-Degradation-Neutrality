# Annex F — National code lists (v0.9 draft)

**Session:** Programme step 1 — governance before mobile releases  
**Date:** 2026-11-23  
**Status:** Pending EMA sign-off (Phase 1 gate)  
**Machine-readable:** [`public/reference-code-lists.v0.9.json`](../public/reference-code-lists.v0.9.json)

---

## F.1 Purpose

One **versioned** source for labels and codes used by:

- Android / iOS mobile forms  
- PostgreSQL `reference_code_lists` (Phase 1)  
- Dashboard filters and PRAIS exports  

No separate field tool; mobile bundles this JSON (or API fetch) per app release.

---

## F.2 LDN severity (canonical)

| Code | Display | Maps legacy / cache |
|------|---------|---------------------|
| `none` | None | `non` |
| `low` | Low | `sli`, **Mild** (drylands) |
| `moderate` | Moderate | `mod`, `Moderate` |
| `severe` | Severe | `sev`, `Severe`, mobile “High” → **severe** (not separate) |

**Decision (draft):** Mobile `LdnForm` “High” maps to `severe`; harmonise app labels to Low / Moderate / Severe / None in Phase 3.

---

## F.3 LDN land cover → UNCCD 7-class

See Annex A §A.2; national subclasses retained in `land_cover_national`. Mobile target list in JSON `ldn_land_cover_national`.

---

## F.4 Drylands erosion severity

| Canonical | Accept legacy import labels |
|-----------|----------------------------|
| Low | `Low`, **`Mild`** |
| Moderate | `Moderate` |
| Severe | `Severe` |

ETL rule: `trim()` + map `Mild` → `low` on ingest (Phase 1).

---

## F.5 Soil texture

Codes `sand`, `sanlo`, `cllo`, `clay` — USDA labels in JSON.

---

## F.6 Sign-off

- [ ] National reporting officer approves v0.9  
- [ ] Bush/Shrub UNCCD class rule (Annex A)  
- [ ] Publish `reference_code_lists` v1.0 in database  
- [ ] Mobile release pinned to `code_list_version`

---

## Document control

| Version | Date | Changes |
|---------|------|---------|
| 0.9-draft | 2026-11-23 | Initial consolidated lists |