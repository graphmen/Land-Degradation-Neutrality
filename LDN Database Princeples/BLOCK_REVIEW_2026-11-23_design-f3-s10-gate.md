# Block review — Design: Reporting desk F3 / S10 gate

| Item | Value |
|------|--------|
| **Block type** | Design |
| **Outcome met?** | **Yes** |
| **UI** | None (checklist + dry-run only) |

## Delivered

- [`design/REPORTING_DESK_F3_S10_GATE.md`](./design/REPORTING_DESK_F3_S10_GATE.md) — staged F3 pass criteria  
- [`REPORTING_DESK_CHECKLIST.md`](./REPORTING_DESK_CHECKLIST.md) — B0, A5, F3 sub-checklist, blockers  
- `reporting_desk_dry_run.ts` → `gates.s10_f3` with `required_for_pass[]`

## Dry-run

F3 `pass: false` until national zonal stats; `corpus_registered: true` for LC-NAT-STACK.

## Next block

**Build** — `scripts/lc_stack_qc.py` when GeoTIFFs arrive, or **Data** — LPD raster register row (F4).