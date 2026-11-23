#!/usr/bin/env python3
"""QC for national SO1 rasters (LC/LPD/SOC) under important files/. Checklist-only needs no GDAL."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORTANT = ROOT / "important files"
OUT = ROOT / "public" / "qc-national-rasters-report.json"

LAYERS = [
    {
        "layer_id": "LC-NAT-STACK",
        "steering": "S10",
        "f_step": "F3",
        "patterns": ["*lc*t0*.tif", "*lc*t1*.tif", "*lc*national*.tif", "lc-national-t0.tif", "lc-national-t1.tif"],
        "expected_count": 2,
        "import_plan": "LDN Database Princeples/corpus/metadata/LC-NAT-STACK_IMPORT_PLAN.md",
    },
    {
        "layer_id": "LPD-NAT-RASTER",
        "steering": "S11",
        "f_step": "F4",
        "patterns": ["*lpd*.tif", "lpd-national.tif", "*lpd*.csv"],
        "expected_count": 1,
        "import_plan": "LDN Database Princeples/corpus/metadata/LPD-NAT-RASTER_IMPORT_PLAN.md",
    },
    {
        "layer_id": "SOC-NAT-SURFACE",
        "steering": "S12",
        "f_step": "F5",
        "patterns": ["*soc*.tif", "soc-national-0-30.tif", "*soc*.csv"],
        "expected_count": 1,
        "import_plan": "LDN Database Princeples/corpus/metadata/SOC-NAT-SURFACE_IMPORT_PLAN.md",
    },
]


def gdalinfo_summary(path: Path) -> dict | None:
    gdalinfo = shutil.which("gdalinfo")
    if not gdalinfo:
        return {"gdalinfo": "not_on_path"}
    try:
        out = subprocess.check_output(
            [gdalinfo, "-json", str(path)],
            stderr=subprocess.STDOUT,
            text=True,
            timeout=120,
        )
        data = json.loads(out)
        size = data.get("size", [])
        crs = (data.get("coordinateSystem", {}) or {}).get("wkt") or ""
        crs_short = crs[:80] + "..." if len(crs) > 80 else crs
        return {
            "size_x": size[0] if len(size) > 0 else None,
            "size_y": size[1] if len(size) > 1 else None,
            "bands": len(data.get("bands", [])),
            "crs_wkt_prefix": crs_short,
        }
    except (subprocess.CalledProcessError, json.JSONDecodeError, OSError) as e:
        return {"error": str(e)[:200]}


def find_matches(patterns: list[str]) -> list[Path]:
    found: list[Path] = []
    if not IMPORTANT.exists():
        return found
    for pat in patterns:
        for p in IMPORTANT.glob(pat):
            if p.is_file() and p not in found:
                found.append(p)
    return sorted(found)


def checklist_only() -> None:
    print("National SO1 raster delivery checklist (important files/):\n")
    for layer in LAYERS:
        print(f"  [{layer['steering']}] {layer['layer_id']} ({layer['f_step']})")
        print(f"       patterns: {', '.join(layer['patterns'][:3])}...")
        print(f"       plan: {layer['import_plan']}\n")
    print("Also resolve Q1/Q2 before LDN-NAT-ALL PostGIS load.")
    print("Run: python scripts/national_raster_qc.py")


def run_scan() -> dict:
    gdal_on_path = shutil.which("gdalinfo") is not None
    layers_out = []
    for layer in LAYERS:
        matches = find_matches(layer["patterns"])
        files = []
        for m in matches:
            entry: dict = {
                "path": str(m.relative_to(ROOT)),
                "bytes": m.stat().st_size,
            }
            if m.suffix.lower() in (".tif", ".tiff", ".vrt"):
                entry["gdal"] = gdalinfo_summary(m)
            files.append(entry)
        layers_out.append(
            {
                "layer_id": layer["layer_id"],
                "steering": layer["steering"],
                "f_step": layer["f_step"],
                "files_found": len(matches),
                "expected_min_files": layer["expected_count"],
                "delivery_ready": len(matches) >= layer["expected_count"],
                "files": files,
                "import_plan": layer["import_plan"],
            }
        )
    report = {
        "qc_at": datetime.now(timezone.utc).isoformat(),
        "important_dir": str(IMPORTANT.relative_to(ROOT)),
        "gdalinfo_available": gdal_on_path,
        "layers": layers_out,
        "steering_blockers": [
            *([] if any(x["delivery_ready"] for x in layers_out if x["layer_id"] == "LC-NAT-STACK") else ["S10: LC t0/t1 GeoTIFF not delivered"]),
            *([] if any(x["delivery_ready"] for x in layers_out if x["layer_id"] == "LPD-NAT-RASTER") else ["S11: LPD raster not delivered"]),
            *([] if any(x["delivery_ready"] for x in layers_out if x["layer_id"] == "SOC-NAT-SURFACE") else ["S12: SOC surface not delivered"]),
        ],
    }
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="National SO1 raster QC")
    parser.add_argument(
        "--checklist-only",
        action="store_true",
        help="Print expected delivery patterns (no scan)",
    )
    args = parser.parse_args()
    if args.checklist_only:
        checklist_only()
        return 0
    report = run_scan()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())