# CEID join quality check (LDN-NAT-ALL ↔ field)

**Block:** Data (QC spec + script) · **Does not load polygons**

## Run

```powershell
cd C:\Users\ndebelem.ZINGSERVER1\Desktop\2026\OAU
python scripts/ceid_join_qc.py
```

After unzipping shapefiles:

```powershell
python scripts/ceid_join_qc.py --shp "important files\LDN shapefiles\Combined ldn shapefiles.shp"
```

Output: `public/qc-ceid-join-report.json` (safe to commit summary; no secrets).

## Interpretation

| Result | Action |
|--------|--------|
| High `match_rate` with suffix → `Id` | Document rule in Annex C §C.3; implement FK in platform |
| Low match | Steering workshop — CEID format vs Collect Earth |
| No shapefile yet | Script still reports CEID format stats from 150 field rows |

## Steering

Answers Q2 in [`LDN-NAT-ALL_IMPORT_PLAN.md`](./LDN-NAT-ALL_IMPORT_PLAN.md).