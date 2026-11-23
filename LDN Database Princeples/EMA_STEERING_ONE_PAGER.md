# EMA LDN programme — steering one-pager (sign-off pack)

**For step 0.7** — attach to meeting invite; full detail in annexes.

---

## Deliverables (assignment)

1. **National LDN database** — PostgreSQL/PostGIS, verification, PRAIS exports (Deliverable A).  
2. **Mobile data collection** — **Android + iOS only** (Deliverable B).

---

## Progress (Nov 2026)

| Area | Status |
|------|--------|
| Programme guide + work plan | v0.5–0.6 Word/Markdown |
| Annexes A–F + spatial register C | Draft complete |
| Verification + export package | Annex E |
| Code lists | v0.9 draft (`/api/reference/code-lists`) |
| LDN cache ETL | 150/150 `land_cover` populated |
| Monitoring sites | 28 points imported |
| EMA projects (staging) | 47 points (`ema-projects-import.json`) |
| Mobile forms | LDN / Soil / Drylands use national code lists |

---

## Decisions requested

1. Approve Annex F severity + land cover labels.  
2. Confirm CEID ↔ polygon `Id` join (GIS).  
3. Approve applying `001_reference_code_lists.sql` on Supabase.  
4. Replace demo interventions with EMA import on go-live.

---

## References

[`PROGRAMME_EXECUTION_STEPS.md`](./PROGRAMME_EXECUTION_STEPS.md) · [`ANNEX_INDEX.md`](./ANNEX_INDEX.md)