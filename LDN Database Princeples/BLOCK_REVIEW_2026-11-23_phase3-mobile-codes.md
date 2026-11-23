# Block review — 2026-11-23 — Mobile canonical codes (Phase 3.2)

## What ran this block

| Item | Result |
|------|--------|
| LDN form | Saves `landcov` + `sev` as **codes**; UI shows Annex F labels; drafts carry `code_list_version` |
| Drylands form | `erosion_severity` saved as code (`none`/`low`/`moderate`/`severe`); **None** added to reference JSON |
| Soil form | Core **moisture** saved as codes (`dry`/`moist`/`wet`); texture unchanged (already codes) |
| API read | `lib/normalize-field-values.ts` exposes `erosion_severity_code` + display label (Mild→Low) |
| Step 1.3 helper | `scripts/generate_code_list_seed_sql.js` → `backend/migrations/001_reference_code_lists_seed.sql` |
| Step 2.1 runbook | [`IMPORT_NATIONAL_LDN_UNITS.md`](./IMPORT_NATIONAL_LDN_UNITS.md) |

## Git

Push after commit on `main` (see latest commit message on GitHub).

## Your review checklist (one pass)

1. Open **mobile** → LDN step 2/3: pick land cover + severity → save draft → inspect IndexedDB / queue JSON: values should be **codes** (`cropland`, `low`, etc.).
2. Drylands erosion: pick **Low** → draft should store `low` not `Low`.
3. Soil core: moisture dropdown values are codes; list shows human labels.
4. Dashboard `/api/drylands`: records include `erosion_severity_code` where severity is set.
5. Optional DB: run `001` migration then paste/run `001_reference_code_lists_seed.sql` in Supabase.

## Still open (next blocks, no “continue” needed)

- Apply migrations **001/002** on Supabase.
- **2.1** actual polygon load after EMA answers (see import runbook).
- **3.1** iOS build; land use national list on LDN form (still free-text constants).
- **0.7** steering sign-off.