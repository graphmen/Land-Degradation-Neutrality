# Block review — Data: SOC-NAT-SURFACE (F5 Tier-1)

| Item | Value |
|------|--------|
| **Block type** | Data |
| **Outcome met?** | **Yes** |

## Delivered

- **SOC-NAT-SURFACE** register, import plan, YAML  
- **S12** · EXP-META **13** layers · `gates.s12_f5`  
- F5 dry-run: `tier2_pass` still true pattern; full `pass` false until Tier-1 metric

## Next

**Build** — `scripts/lc_stack_qc.py` (when LC files land) or **Steering** — bundle S10–S12 on one GIS slide for R1.