# Block review — Phase 1 ETL & mobile code lists (clinical)

**Date:** 2026-11-23  
**Programme steps:** 1.4, 1.5 (complete), 1.6 (started)  
**Commit:** *(see git log after push)*

---

## Objective

Fix empty LDN denormalized columns; unify ETL; wire sync pipeline; start mobile alignment to Annex F.

---

## Changes (what / why)

| Item | File(s) | Outcome |
|------|---------|---------|
| **1.4 LDN mapper** | `scripts/ldn-record-mapper.js` | Single source for `land_cover`, `land_use`, GPS, severity, etc. from `raw_data` |
| **1.4 Cache rewrite** | `scripts/flatten_ldn_cache.js`, `public/ldn-data.json` | **150/150** records now have `land_cover` and `land_use` |
| **Supabase ETL fix** | `scripts/repopulate-supabase.js` | Uses mapper; **removed** erroneous `ldi/tree` → `land_use` |
| **Sync pipeline** | `app/api/sync/route.ts` | Runs flatten after download (local + Vercel paths) |
| **1.5 Excel** | `import_drylands.py` | `Mild` → `Low` on ILUP import |
| **1.6 mobile** | `mobile/src/lib/code-lists.ts`, `LdnForm.tsx` | Severity options from bundled v0.9 JSON |

---

## Verification (you can spot-check)

```powershell
# LDN cache columns populated
python -c "import json; r=json.load(open('public/ldn-data.json'))['records']; print(sum(1 for x in r if x.get('land_cover')), len(r))"

# API code lists
curl http://localhost:3002/api/reference/code-lists

# Flatten manually after edits
node scripts/flatten_ldn_cache.js
```

---

## Not in scope (deferred)

| Step | Reason |
|------|--------|
| 1.3 Supabase code list table | Needs migration SQL + credentials |
| 1.6 full mobile | Soil/Drylands forms still use local arrays |
| 2.x PostGIS | Separate block |

---

## Recommended next block

1. **1.6** — Wire `SoilForm` + `DrylandsForm` to code lists; map saves to canonical **codes** not labels.  
2. **1.3** — Draft Supabase SQL for `reference_code_lists`.  
3. **2.2** — Script to import 47 EMA project points to `interventions-data` staging JSON.

---

## Sign-off needed from EMA

- [ ] Annex F severity labels (None / Low / Moderate / Severe)  
- [ ] Approve use of flattened cache as dashboard source until DB-first sync  