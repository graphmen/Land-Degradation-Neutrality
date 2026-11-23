#!/usr/bin/env python3
"""QA on SBC + EMA projects nested zips (intervention spatial layers)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from pressure_layer_qc import scan_zip
IMPORTANT = ROOT / "important files"
OUT = ROOT / "public" / "qc-intervention-spatial-report.json"

PACKAGES = [
    ("INT-SBC", "sbc.zip"),
    ("INT-PROJECTS", "projects.zip"),
]


def main() -> None:
    report: dict = {"packages": []}
    for layer_id, archive in PACKAGES:
        zip_path = IMPORTANT / archive
        layers = scan_zip(zip_path)
        entry = {
            "layer_id": layer_id,
            "archive": str(zip_path.relative_to(ROOT)),
            "layers": layers,
        }
        latlong = next(
            (L for L in layers if "LatLong" in L.get("layer", "") or "geog" in L.get("layer", "").lower()),
            layers[0] if len(layers) == 1 else None,
        )
        entry["recommended_authoritative_layer"] = latlong.get("layer") if latlong else None
        entry["authoritative_feature_count"] = (
            latlong.get("features") if latlong else None
        )
        entry["feature_total_all_layers"] = sum(
            L.get("features", 0) for L in layers if "features" in L
        )
        report["packages"].append(entry)

    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {OUT}")


if __name__ == "__main__":
    main()