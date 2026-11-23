# S2 apply preflight (local — before SQL editor)

Run on any machine with the repo clone:

```powershell
npm run s2:preflight
```

Output: `public/s2-migration-preflight.json`

| Check | Meaning |
|-------|---------|
| `phase_ab_ready: true` | All four Phase A+B SQL files present + code list JSON |
| `sha256` per file | Paste into steering minutes for reproducibility |
| `phase_cd_deferred` | **Do not** run 003/002 until S8 / S3–S4 |

**After steering S1 + S2 approved:** follow [`SUPABASE_S2_STEERING_RUNBOOK.md`](./SUPABASE_S2_STEERING_RUNBOOK.md).

**Remote verify:** `npm run verify:supabase` (needs env).