# Block review — Backend — governance API Phase 1

| | |
|---|---|
| **Type** | Backend (Annex E §E.7 Phase 1) |
| **Outcome** | Compliance enrichment expanded; mobile submit governance; `004` migration; `/api/config/reporting`; `/api/verify/transition` (local ledger) |

## Delivered

- [`lib/compliance-metadata.ts`](../../lib/compliance-metadata.ts) — `newFieldSubmissionGovernance`, baseline defaults  
- [`lib/mobile-submit-mappers.ts`](../../lib/mobile-submit-mappers.ts) — LDN / soil / drylands aligned  
- [`public/reporting-period-config.json`](../../public/reporting-period-config.json)  
- [`design/GOVERNANCE_API_P1.md`](./GOVERNANCE_API_P1.md)

## Steering

- Sign reporting period `2020-2023` or replace in JSON + migration seed  
- Apply migration **004** on Supabase before relying on DB columns

## Next block

Pressure layer unpack QA (`PRESS-MINING` / `PRESS-INVASIVE`) **or** `verification_log` migration draft (Phase 2).