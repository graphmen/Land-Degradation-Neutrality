# Block review — Build: pressure layers staging (S8)

| Item | Value |
|------|--------|
| **Block type** | Build |
| **Outcome met?** | **Yes** |

## Delivered

- `scripts/import_pressure_layers.py` — Lat/Long only → **2804** points (2035 invasive, 769 mining)
- `public/pressure-layers-staging.json`
- `GET /api/pressure-layers` (+ `?theme=`)
- Corpus manifest **staging_json** for PRESS-*

## Not done

PostGIS load — awaits **S8** sign-off + S2 Phase C (`003`).

## Next

**Study** — `MOBILE_IOS_CHECKLIST.md` refresh, or **Design** — pressure layer map spec in R1 (no new chrome).