# CEID validator API (Phase 3.3 prep)

**Endpoint:** `GET /api/validator/ceid?ceid={ceid}&rule=second_segment`  
**Index:** `public/national-unit-ld-index.json` (regen: `python scripts/build_national_unit_index.py`)

## Response (match)

```json
{
  "success": true,
  "ceid": "11268_17236",
  "rule": "second_segment",
  "shapefile_id": "17236",
  "match": true,
  "match_via": "join_rule",
  "alias_status": null,
  "alias_category": null,
  "national_unit": {
    "ld_class": "Stable",
    "polygon_count": 6,
    "area_sum": 44.12
  }
}
```

## Response (legacy pending alias)

`GET /api/validator/ceid?ceid=ZC2` → `match: false`, `alias_status: pending_ema`, `alias_category: legacy_zc_ze_token`

**Register:** `GET /api/config/ceid-aliases` · Design: [`CEID_ALIAS_REGISTER.md`](../design/CEID_ALIAS_REGISTER.md)

## Mobile

Point validator UI at this URL (national host) when online; offline remains GeoJSON legacy until index subset shipped.

## Steering

Confirm rule **Q2** before hard-coding in mobile production build.