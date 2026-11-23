# Block review — LPD/SOC exports + mobile API deploy doc

| Item | Outcome |
|------|---------|
| **F4** | `GET /api/export/so1-lpd` — 4-class template |
| **F5** | `GET /api/export/so1-soc` — 632 Tier-2 rows, depth 0–30 on all cores |
| **Mobile** | `MOBILE_API_DEPLOY.md` + `.env.example` production notes |

Dry-run: `npx tsx scripts/reporting_desk_dry_run.ts`