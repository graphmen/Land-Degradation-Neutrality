#!/usr/bin/env python3
"""Stage INT-SBC Lat/Long points from important files/sbc.zip."""
from __future__ import annotations

import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
IMPORTANT = ROOT / "important files"
OUT = ROOT / "public" / "intervention-sbc-staging.json"
ZIP_NAME = "sbc.zip"
LAYER_ID = "INT-SBC"
THEME = "sbc"


def read_latlong_shapes(zip_path: Path, layer_prefix: str = "") -> list[tuple[str, list[str], object]]:
    import shapefile

    out: list[tuple[str, list[str], object]] = []
    if not zip_path.exists():
        return out

    with zipfile.ZipFile(zip_path) as zf:
        for nested in [n for n in zf.namelist() if n.lower().endswith(".zip")]:
            with tempfile.TemporaryDirectory() as tmp:
                inner_path = Path(tmp) / Path(nested).name
                zf.extract(nested, tmp)
                out.extend(read_latlong_shapes(inner_path, layer_prefix=f"{layer_prefix}{nested}/"))

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
    zip_path = IMPORTANT / ZIP_NAME
    shapes = read_latlong_shapes(zip_path)
    records: list[dict] = []

    for source_layer, fields, sr in shapes:
        rec = dict(zip(fields, sr.record))
        lat_k = norm_field(fields, "lat", "LAT")
        lon_k = norm_field(fields, "lon", "LONG", "LNG")
        if not lat_k or not lon_k:
            continue
        try:
            lat = float(rec[lat_k])
            lng = float(rec[lon_k])
        except (TypeError, ValueError):
            continue
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            continue

        village = rec.get(norm_field(fields, "Village", "VILLAGE") or "")
        site = rec.get(norm_field(fields, "Site_Num", "SITE_NUM") or "")
        ward = rec.get(norm_field(fields, "Ward", "WARD") or "")
        name = str(village or site or f"SBC {len(records) + 1}")

        attrs = {k: v for k, v in rec.items() if k not in (lat_k, lon_k)}

        records.append(
            {
                "_id": 300000 + len(records),
                "name": name,
                "category": "Soil & water conservation",
                "org": "EMA",
                "admin_level": "Ward",
                "admin_area": f"Ward {ward}" if ward else None,
                "ward": ward,
                "lat": lat,
                "lng": lng,
                "status": "Recorded",
                "data_tier": "tier2_national",
                "theme": THEME,
                "layer_id": LAYER_ID,
                "attributes": attrs,
                "_source": "sbc_latlong_shapefile",
                "_import_layer": LAYER_ID,
                "source_layer": source_layer,
            }
        )

    payload = {
        "count": len(records),
        "policy": "lat_long_only",
        "layer_id": LAYER_ID,
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "records": records,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in payload.items() if k != "records"}, indent=2))
    print(f"OK: {len(records)} SBC points -> {OUT}")
    return 0 if records else 1


if __name__ == "__main__":
    raise SystemExit(main())