# Block review — Steering: Supabase S2 runbook

| Item | Value |
|------|--------|
| **Block type** | Steering |
| **Outcome met?** | **Yes** |
| **Push** | `50d5932` already on `origin/main` before block |

## Delivered

- [`backend/SUPABASE_S2_STEERING_RUNBOOK.md`](../backend/SUPABASE_S2_STEERING_RUNBOOK.md) — phased **A/B/C/D** apply with steering gates
- [`backend/APPLY_MIGRATIONS.md`](../backend/APPLY_MIGRATIONS.md) aligned with programme order (no early `002`)
- Steering pack: one-pager, decisions queue, meeting brief (pilot lock + S2 DBA pack)
- `npm run verify:supabase` / `verify:supabase:checklist`

## Remote probe

`node scripts/verify_supabase_schema.mjs` — **fetch failed** from this workstation (network or env). Use runbook in Supabase SQL editor; probe after **S2** with service role in env.

## Next block

**Study** — peer twin deep-dive section for R1 pack, or **Data** — corpus row for LC rasters (F3).