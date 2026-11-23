# Block review — 2026-11-23 — Mobile sync + land use codes

## Delivered

| Item | Detail |
|------|--------|
| **2.3** | `POST /api/submit/ldn`, `/soil`, `/drylands` — tries **Supabase** insert, always updates **local JSON** cache via `lib/local-data-modifications.ts` |
| **3.2** | Annex A **land use** list `ldn_land_use_type`; LDN form saves codes |
| **Mobile queue** | Default hub `http://localhost:3000` (set `VITE_API_BASE_URL` for prod); no Google Sheets default |
| **Security** | `download_schemas.py` — credentials via env only (legacy Kobo, deprecated) |
| **DB** | `backend/APPLY_MIGRATIONS.md` + regenerated seed SQL |

## Quick test (when back)

1. `npm run dev` in repo root; mobile `VITE_API_BASE_URL=http://localhost:3000 npm run dev`.
2. Save an LDN draft → Queue → Upload — expect 200 and draft cleared.
3. Check `public/ldn-modifications.json` / `ldn-data.json` for new record with `_status: submitted_via_mobile`.

## Notes

- If Supabase insert fails (RLS/schema), upload still succeeds to **local cache**; response lists `persisted_to`.
- Set production mobile env before field pilot (Vercel URL).

**Prior review:** [Mobile codes](./BLOCK_REVIEW_2026-11-23_phase3-mobile-codes.md)