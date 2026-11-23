# R1 steering — minutes template (fill in room)

**Meeting date:** _______________  
**Chair:** _______________ · **Minute taker:** _______________  
**Attendees:** _______________

**Repo commit at meeting:** _______________ (optional `git rev-parse HEAD`)

---

## 1. Corpus-first platform (opening)

- [ ] Agreed: extend **National LDN Data Platform**, not OAU dashboard as product story  
- Notes: _______________________________________________________________

---

## 2. Decisions (S1–S12)

| ID | Decision | Outcome ☐ Approved ☐ Deferred ☐ Amended | Notes |
|----|----------|----------------------------------------|-------|
| **S1** | Code lists v1.0 | | |
| **S2** | Supabase Phase A+B | DBA owner: ________ | |
| **S3** | LDN-NAT-ALL Area unit **Q1** | Unit: ________ | |
| **S4** | CEID ↔ `Id` **Q2** | Rule: ________ | |
| **S5** | Reporting period | Period: ________ | |
| **S6** | R1 module map | | |
| **S7** | Peer twins | Twins: ________ | |
| **S8** | Pressure Lat/Long policy | | |
| **S9** | Projects geog policy | | |
| **S10** | LC national stack | Delivery date: ________ | |
| **S11** | LPD national | Delivery date: ________ | |
| **S12** | SOC national | Delivery date: ________ | |

**CEID workshop:** aliases CSV returned by __________ ? ☐ Yes ☐ N/A

---

## 3. R1 sign-off (§9)

| # | Statement | ☐ Agree |
|---|-----------|--------|
| 1 | Module names acceptable for government | |
| 2 | Landing = National overview | |
| 3 | Evidence registry = single field entry | |
| 4 | Verification states match workflow | |
| 5 | No new OAU chrome until R2 | |

**R2 authorized:** ☐ **Go** · ☐ **No-go** · ☐ **Conditional** (list): _______________

**Signature:** _________________________ **Date:** ___________

---

## 4. Actions (owners)

| Action | Owner | Due |
|--------|-------|-----|
| Run Supabase A+B if S2 approved | | |
| Return CEID alias CSV | GIS | |
| Drop national rasters per study | GIS | |
| Update `reporting-period-config.json` if S5 | Reporting officer | |
| Schedule R2 sprint if §9 go | ICT | |

---

## 5. Attachments used

☐ Word pack `exports/steering-docx/`  
☐ CEID `CEID_ALIAS_WORKSHOP.csv`  
☐ API demo [`R1_API_DEMO_SCRIPT.md`](./R1_API_DEMO_SCRIPT.md)

**Post-meeting:** commit decision updates to `STEERING_DECISIONS_QUEUE.md` · `PROGRAMME_EXECUTION_STEPS.md` (R1 → ✅ if signed).