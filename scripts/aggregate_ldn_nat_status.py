#!/usr/bin/env python3
"""Zonal summary of LDN-NAT-ALL `LD` classes for EXP-SO1-STATUS stub."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHP = ROOT / "important files" / "LDN shapefiles" / "Combined ldn shapefiles.shp"
OUT = ROOT / "public" / "national-ldn-status-summary.json"


def main() -> None:
    import shapefile

    if not SHP.exists():
        OUT.write_text(
            json.dumps({"error": "shapefile not found", "path": str(SHP)}, indent=2),
            encoding="utf-8",
        )
        raise SystemExit(1)

    fields = []
    idx_ld = idx_area = None
    totals = defaultdict(lambda: {"polygon_count": 0, "area_sum": 0.0})
    total_area = 0.0
    n = 0

    with shapefile.Reader(str(SHP)) as sf:
        fields = [f[0] for f in sf.fields if f[0] != "DeletionFlag"]
        idx_ld = fields.index("LD")
        idx_area = fields.index("Area")
        for rec in sf.iterRecords():
            n += 1
            ld = str(rec[idx_ld]).strip()
            area = float(rec[idx_area])
            totals[ld]["polygon_count"] += 1
            totals[ld]["area_sum"] += area
            total_area += area

    rows = []
    for ld, agg in sorted(totals.items()):
        pct = (agg["area_sum"] / total_area * 100) if total_area else 0
        rows.append(
            {
                "ld_class": ld,
                "polygon_count": agg["polygon_count"],
                "area_sum": round(agg["area_sum"], 4),
                "area_percent": round(pct, 4),
            }
        )

    report = {
        "source_layer": "LDN-NAT-ALL",
        "shapefile": str(SHP.relative_to(ROOT)),
        "polygon_count": n,
        "area_unit": None,
        "area_unit_steering": "EMA Q1 — assumed hectares until signed",
        "area_total": round(total_area, 4),
        "by_ld_class": rows,
        "so14_note": "National LD classes support narrative QA; SDG 15.3.1 proportion requires 1OAO on LC+LPD+SOC.",
        "generated_by": "scripts/aggregate_ldn_nat_status.py",
    }
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {OUT}")


if __name__ == "__main__":
    main()