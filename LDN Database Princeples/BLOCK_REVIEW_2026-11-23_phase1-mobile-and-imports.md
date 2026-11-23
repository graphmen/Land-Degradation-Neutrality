# Block review — Phase 1 mobile code lists + staging imports

**Date:** 2026-11-23  
**Steps:** 1.6 (complete), 1.3 (SQL draft), 2.2 (staging JSON)

---

## Done

| Step | Deliverable |
|------|-------------|
| **1.6** | `LdnForm`, `SoilForm`, `DrylandsForm` read Annex F from bundled JSON |
| **1.3** | `backend/migrations/001_reference_code_lists.sql` (apply in Supabase when ready) |
| **2.2** | `scripts/import_ema_projects.py` → **`public/ema-projects-import.json` (47 records)** |
| **JSON** | Extended `reference-code-lists.v0.9.json` (soil moisture, sample location, LDN land cover labels) |

---

## Spot-check (optional)

```powershell
python scripts/import_ema_projects.py
Get-Content public\ema-projects-import.json -TotalCount 25
```

Mobile: rebuild APK after pull — land cover list should show Tree/Forest, not old “Forest Land”.

---

## Deferred

- Merge `ema-projects-import.json` into live `/interventions` (keep demo separate until EMA approves)
- Soil texture **codes** on save (UI still may store label — next micro-fix)
- Run migration SQL on production Supabase

---

## Next block (automatic)

1. **2.1** PostGIS import spec script stub for LDN polygons  
2. Interventions API optional layer reading `ema-projects-import.json`  
3. **0.7** Pack PDF annex summary for EMA steering one-pager  