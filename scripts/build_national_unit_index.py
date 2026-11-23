#!/usr/bin/env python3
"""Build public/national-unit-ld-index.json from Combined shapefile (LDN-NAT-ALL)."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHP = ROOT / "important files" / "LDN shapefiles" / "Combined ldn shapefiles.shp"
OUT = ROOT / "public" / "national-unit-ld-index.json"


def main() -> None:
    import shapefile

    if not SHP.exists():
        raise SystemExit(f"Missing shapefile: {SHP}")

    by_id: dict[str, dict] = defaultdict(
        lambda: {"ld_class": None, "polygon_count": 0, "area_sum": 0.0}
    )
    with shapefile.Reader(str(SHP)) as sf:
        fields = [f[0] for f in sf.fields if f[0] != "DeletionFlag"]
        idx_id = fields.index("Id")
        idx_ld = fields.index("LD")
        idx_area = fields.index("Area")
        for rec in sf.iterRecords():
            uid = str(int(rec[idx_id]))
            by_id[uid]["ld_class"] = str(rec[idx_ld]).strip()
            by_id[uid]["polygon_count"] += 1
            by_id[uid]["area_sum"] += float(rec[idx_area])

    payload = {
        "schema_version": 1,
        "source_layer": "LDN-NAT-ALL",
        "join_rule_interim": "second_segment",
        "area_unit": None,
        "unit_count": len(by_id),
        "units": {
            k: {
                "ld_class": v["ld_class"],
                "polygon_count": v["polygon_count"],
                "area_sum": round(v["area_sum"], 4),
            }
            for k, v in sorted(by_id.items(), key=lambda x: int(x[0]))
        },
    }
    OUT.write_text(json.dumps(payload), encoding="utf-8")
    print(f"Wrote {OUT} ({len(by_id)} units)")


if __name__ == "__main__":
    main()