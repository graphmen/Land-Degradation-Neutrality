#!/usr/bin/env python3
"""
Stage PRESS-INVASIVE + PRESS-MINING (Lat/Long shapefiles only — S8)
to public/pressure-layers-staging.json. PostGIS: apply 003 then bulk load.
"""
from __future__ import annotations

import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
IMPORTANT = ROOT / "important files"
OUT = ROOT / "public" / "pressure-layers-staging.json"

PACKAGES = [
    ("PRESS-INVASIVE", "invasive", "invasivespecies.zip"),
    ("PRESS-MINING", "illegal_mining", "illegalminingshapefiles.zip"),
]


def read_latlong_from_zip(zip_path: Path, layer_prefix: str = "") -> list[tuple[str, list[str], object]]:
    """Return list of (source_layer, field_names, shape_record) for LatLong .shp only."""
    import shapefile

    out: list[tuple[str, list[str], object]] = []
    if not zip_path.exists():
        return out

    with zipfile.ZipFile(zip_path) as zf:
        for nested in [n for n in zf.namelist() if n.lower().endswith(".zip")]:
            with tempfile.TemporaryDirectory() as tmp:
                inner_path = Path(tmp) / Path(nested).name
                zf.extract(nested, tmp)
                out.extend(
                    read_latlong_from_zip(
                        inner_path, layer_prefix=f"{layer_prefix}{nested}/"
                    )
                )

        for name in zf.namelist():
            if not name.lower().endswith(".shp"):
                continue
            full_name = f"{layer_prefix}{name}"
            if "latlong" not in full_name.lower():
                continue
            with tempfile.TemporaryDirectory() as tmp:
                tmp_path = Path(tmp)
                stem = name[:-4]
                for ext in (".shp", ".shx", ".dbf", ".prj", ".cpg"):
                    member = stem + ext
                    if member in zf.namelist():
                        zf.extract(member, tmp_path)
                shp = tmp_path / Path(name).name
                if not shp.exists():
                    continue
                with shapefile.Reader(str(shp)) as sf:
                    fields = [f[0] for f in sf.fields if f[0] != "DeletionFlag"]
                    for sr in sf.iterShapeRecords():
                        out.append((full_name, fields, sr))
    return out


def norm_field(fields: list[str], *names: str) -> str | None:
    m = {f.upper(): f for f in fields}
    for n in names:
        if n.upper() in m:
            return m[n.upper()]
    return None


def main() -> int:
    records: list[dict] = []
    by_theme: dict[str, int] = {}

    for layer_id, theme, archive in PACKAGES:
        zip_path = IMPORTANT / archive
        shapes = read_latlong_from_zip(zip_path)
        n = 0
        for source_layer, fields, sr in shapes:
            rec = dict(zip(fields, sr.record))
            lat_k = norm_field(fields, "LAT")
            lng_k = norm_field(fields, "LONG", "LON", "LNG")
            if not lat_k or not lng_k:
                continue
            try:
                lat = float(rec[lat_k])
                lng = float(rec[lng_k])
            except (TypeError, ValueError):
                continue
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                continue
            attrs = {k: v for k, v in rec.items() if k not in (lat_k, lng_k)}
            records.append(
                {
                    "_id": f"{theme}-{len(records)}",
                    "layer_id": layer_id,
                    "theme": theme,
                    "lat": lat,
                    "lng": lng,
                    "attributes": attrs,
                    "sensitivity": "restricted",
                    "data_tier": "tier2_national",
                    "source_layer": source_layer,
                    "crs": "EPSG:4326",
                }
            )
            n += 1
        by_theme[theme] = n

    payload = {
        "count": len(records),
        "policy": "lat_long_only",
        "steering_gate": "S8",
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "by_theme": by_theme,
        "records": records,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in payload.items() if k != "records"}, indent=2))
    print(f"OK: {len(records)} pressure points -> {OUT}")
    return 0 if records else 1


if __name__ == "__main__":
    raise SystemExit(main())