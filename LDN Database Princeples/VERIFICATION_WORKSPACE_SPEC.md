# Verification workspace — functional spec (R1 supplement)

**Design only** — implements after R1 sign-off + migration `verification_log`.

## Purpose

District and national officers review **field evidence** before records become **reporting-eligible** (PRAIS SO1 tables).

## Queues

| Queue | Filter | Actor |
|-------|--------|-------|
| Submitted | `verification_status = submitted` | District verifier |
| District | `district_review` | National reporting officer |
| National | `national_review` | Reporting officer |
| Approved | `approved` (awaiting `locked`) | Reporting officer |
| Locked | `locked` | Read-only; feeds exports |

## Record detail (minimum)

- Evidence type, district/ward, CEID, geometry + accuracy  
- Tier, code list version, collected_at, enumerator/device  
- Photos / attachments  
- Audit trail (who changed status, when, note)  
- **Link:** national unit (`ldn_unit_id`) when join exists  
- **Link:** overlapping pressure layers (mining/invasive) optional flags — see [`design/R1_NATIONAL_LAYERS_MODULE.md`](./design/R1_NATIONAL_LAYERS_MODULE.md) §6

## Actions

| Action | From | To | Required field |
|--------|------|-----|----------------|
| Accept to district | submitted | district_review | — |
| Approve district | district_review | national_review | district_note |
| Approve national | national_review | approved | national_note |
| Reject | * | rejected | reason_code |
| Lock for reporting | approved | locked | reporting_period |

## Non-goals (v1)

- No bulk approve without sampling policy  
- No edit of field values in workspace (return to mobile resubmit)

*States align with* [`R1_INFORMATION_ARCHITECTURE.md`](./R1_INFORMATION_ARCHITECTURE.md) *§6*

**R2 preview API:** [`design/R1_VERIFICATION_QUEUES_API.md`](./design/R1_VERIFICATION_QUEUES_API.md) · `GET /api/verify/queues`

**R2 UI (wireframe):** [`design/R1_VERIFICATION_WORKSPACE_MODULE.md`](./design/R1_VERIFICATION_WORKSPACE_MODULE.md)