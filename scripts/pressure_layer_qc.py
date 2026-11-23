#!/usr/bin/env python3
"""Quick QA on EMA pressure zips (point counts + fields). Requires pyshp + zipfile."""
from __future__ import annotations

import json
import zipfile
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
IMPORTANT = ROOT / "important files"
OUT = ROOT / "public" / "qc-pressure-layers-report.json"

PACKAGES = [
    ("PRESS-INVASIVE", "invasivespecies.zip"),
    ("PRESS-MINING", "illegalminingshapefiles.zip"),
]


def inspect_shp(shp_path: Path) -> dict:
    import shapefile  # pyshp

    with shapefile.Reader(str(shp_path)) as sf:
        fields = [f[0] for f in sf.fields if f[0] != "DeletionFlag"]
        count = len(sf)
    return {"features": count, "fields": fields}


def scan_zip_bytes(zip_path: Path, prefix: str = "") -> list[dict]:
    layers: list[dict] = []
    if not zip_path.exists():
        return [{"error": f"missing: {zip_path}"}]
    with zipfile.ZipFile(zip_path) as zf:
        nested = [n for n in zf.namelist() if n.lower().endswith(".zip")]
        for nested_name in nested:
            with tempfile.TemporaryDirectory() as tmp:
                extracted = Path(tmp) / Path(nested_name).name
                zf.extract(nested_name, tmp)
                layers.extend(
                    scan_zip_bytes(extracted, prefix=f"{prefix}{nested_name}/")
                )

        shp_names = [n for n in zf.namelist() if n.lower().endswith(".shp")]
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            for name in shp_names:
                stem = name[:-4]
                for ext in (".shp", ".shx", ".dbf", ".prj", ".cpg"):
                    member = stem + ext
                    if member in zf.namelist():
                        zf.extract(member, tmp_path)
                shp = tmp_path / Path(name).name
                if shp.exists():
                    info = inspect_shp(shp)
                    info["layer"] = f"{prefix}{Path(name).name}"
                    layers.append(info)
    return layers


def scan_zip(zip_path: Path) -> list[dict]:
    return scan_zip_bytes(zip_path)


def main() -> None:
    report: dict = {"packages": []}
    for layer_id, archive in PACKAGES:
        zip_path = IMPORTANT / archive
        entry = {
            "layer_id": layer_id,
            "archive": str(zip_path.relative_to(ROOT)),
            "layers": scan_zip(zip_path),
        }
        entry["feature_total"] = sum(
            L.get("features", 0) for L in entry["layers"] if "features" in L
        )
        report["packages"].append(entry)

    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {OUT}")


if __name__ == "__main__":
    main()