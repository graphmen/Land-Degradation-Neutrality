# Block review — Data: LC-NAT-STACK corpus (F3 path)

| Item | Value |
|------|--------|
| **Block type** | Data |
| **Outcome met?** | **Yes** |
| **Scope** | Metadata register + import plan only — **no raster load** |

## Delivered

- **`LC-NAT-STACK`** row in corpus register + [`LC-NAT-STACK_IMPORT_PLAN.md`](./corpus/metadata/LC-NAT-STACK_IMPORT_PLAN.md) + YAML skeleton  
- **`S10`** on steering queue (T1–T4)  
- `lib/corpus-manifest.ts` → **EXP-META** includes LC stack (`import_status: awaiting_delivery`)  
- `EXP-SO1-LC` template rows use `source_layer_id: LC-NAT-STACK`  
- `important files/README` — pending LC delivery slot

## Steering ask

Decide **T1** (Trends.Earth vs EMA national LC) and deliver **t₀/t₁** GeoTIFFs to `important files/`.

## Next block

**Study** — R1 pack peer-twin paragraph, or **Build** — `scripts/lc_stack_qc.py` when files land.