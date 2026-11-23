# R1 steering sign-off pack (facilitation)

**Purpose:** Single meeting artefact for **step R1** · **Blocks:** government web shell (R2)  
**Read first:** [`R1_INFORMATION_ARCHITECTURE.md`](./R1_INFORMATION_ARCHITECTURE.md)

---

## Agenda (60–90 min)

| Time | Topic | Output |
|------|--------|--------|
| 0–10 | Why not extend OAU dashboard | Agree corpus-first story |
| 10–18 | Peer twins → modules (Study) — [`R1_PEER_TWINNING_IA_MAP.md`](./R1_PEER_TWINNING_IA_MAP.md); confirm **S7** | Twins confirmed |
| 18–30 | Walk modules §3–§7 (Evidence, Verification, Layers, Reporting desk) | Names approved |
| 30–45 | RBAC §2 — district vs national vs reporting officer | Role list confirmed |
| 45–55 | Route cutover §8 — what retires | Redirect plan accepted |
| 55–60 | Sign §9 checklist below | **Go / no-go R2** |

---

## §9 checklist (sign here)

| # | Statement | EMA ☐ |
|---|-----------|-------|
| 1 | Module names are acceptable for government briefings | |
| 2 | Default landing is **National overview**, not telemetry KPIs | |
| 3 | **Evidence registry** is the single entry for LDN/soil/drylands | |
| 4 | Verification states match district → national → lock workflow (Annex E) | |
| 5 | Old dashboard routes may redirect; no new OAU chrome until R2 ships | |

**Signed:** _________________________  **Date:** _____________  
**Role:** National reporting officer / delegate

---

## Evidence already built (demo talking points)

- Verification API + audit: [`GOVERNANCE_API_P1.md`](./design/GOVERNANCE_API_P1.md), [`GOVERNANCE_API_P2.md`](./design/GOVERNANCE_API_P2.md)
- Export rehearsal §F: `npx tsx scripts/export_reporting_bundle.ts`
- Corpus QC: register + pressure/SBC counts
- Mobile submit → `/api/submit/*` (production URL: [`MOBILE_API_DEPLOY.md`](./MOBILE_API_DEPLOY.md))
- **3-row lock pilot** + `GET /api/status` (`locked_ldn_exports`)
- **LC path** registered: `LC-NAT-STACK` (SO1-1 await **S10**)

**Do not demo:** Legacy home dashboard as “the product.”

---

## Linked steering decisions

Before or with R1, resolve **S1, S5, S6, S7, S10** in [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md).

**Peer narrative (study):** [`R1_PEER_TWINNING_IA_MAP.md`](./R1_PEER_TWINNING_IA_MAP.md) · [`ZIMBABWE_DIFFERENTIATOR_STEERING_ONE_PAGER.md`](./ZIMBABWE_DIFFERENTIATOR_STEERING_ONE_PAGER.md)

---

## After sign-off

| Step | Owner |
|------|--------|
| R2 | Implement Next.js government shell per module map |
| R3 | Default landing = Evidence registry / national overview |
| Update `PROGRAMME_EXECUTION_STEPS.md` R1 → ✅ |