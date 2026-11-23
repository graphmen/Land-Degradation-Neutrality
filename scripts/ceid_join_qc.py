#!/usr/bin/env python3
"""
CEID ↔ national LDN unit join QA (Step 2.1 prep).
Reads field CEIDs from public/ldn-data.json; optionally compares to Combined shapefile Id.

Usage:
  python scripts/ceid_join_qc.py
  python scripts/ceid_join_qc.py --shp "path/to/Combined ldn shapefiles.shp"

Requires: stdlib only. Optional shapefile: pip install pyshp (or use ogrinfo manually).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LDN_JSON = ROOT / "public" / "ldn-data.json"
DEFAULT_SHP = ROOT / "important files" / "LDN shapefiles" / "Combined ldn shapefiles.shp"
OUT_JSON = ROOT / "public" / "qc-ceid-join-report.json"


def load_field_ceids() -> list[dict]:
    data = json.loads(LDN_JSON.read_text(encoding="utf-8"))
    records = data.get("records") or []
    out = []
    for r in records:
        ceid = r.get("ceid") or r.get("CEID")
        if not ceid:
            raw = r.get("raw_data") or {}
            ceid = raw.get("geninfo/ceid") or raw.get("ceid")
        if ceid:
            out.append({"ceid": str(ceid).strip(), "_id": r.get("id") or r.get("kobo_id")})
    return out


def parse_ceid_parts(ceid: str) -> tuple[str | None, str | None]:
    """Common pattern: wardId_pointId e.g. 11626_16623 — EMA to confirm."""
    if "_" in ceid:
        a, b = ceid.split("_", 1)
        return a.strip(), b.strip()
    if ceid.isdigit():
        return None, ceid
    return None, ceid


def load_shapefile_ids(shp: Path) -> set[str]:
    try:
        import shapefile  # pyshp
    except ImportError:
        print("pyshp not installed; run: pip install pyshp", file=sys.stderr)
        sys.exit(2)
    with shapefile.Reader(str(shp)) as sf:
        fields = [f[0] for f in sf.fields if f[0] != "DeletionFlag"]
        if "Id" not in fields:
            print(f"Shapefile fields: {fields}", file=sys.stderr)
            sys.exit(1)
        idx = fields.index("Id")
        ids = set()
        for rec in sf.iterRecords():
            val = rec[idx]
            if val is not None:
                ids.add(str(int(val)) if isinstance(val, (int, float)) else str(val).strip())
        return ids


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shp", type=Path, default=None, help="Combined LDN shapefile")
    args = ap.parse_args()

    field = load_field_ceids()
    ceids = [f["ceid"] for f in field]
    unique_ceids = sorted(set(ceids))

    suffixes: list[str] = []
    for c in unique_ceids:
        _, suf = parse_ceid_parts(c)
        if suf:
            suffixes.append(suf)

    report: dict = {
        "source": str(LDN_JSON),
        "field_records_with_ceid": len(field),
        "unique_ceids": len(unique_ceids),
        "ceid_format_samples": unique_ceids[:10],
        "suffix_numeric_count": sum(1 for s in suffixes if s.isdigit()),
        "shapefile_checked": False,
        "match_suffix_to_shapefile_id": None,
        "match_count": None,
        "unmatched_ceid_samples": [],
        "ema_questions": [
            "Confirm CEID maps to shapefile field Id (suffix after underscore?)",
            "Confirm Area units on shapefile",
        ],
    }

    shp = args.shp or (DEFAULT_SHP if DEFAULT_SHP.exists() else None)
    if shp and shp.exists():
        ids = load_shapefile_ids(shp)
        report["shapefile_checked"] = True
        report["shapefile_path"] = str(shp)
        report["shapefile_id_count"] = len(ids)
        matched = 0
        unmatched = []
        for c in unique_ceids:
            _, suf = parse_ceid_parts(c)
            key = suf if suf else c
            if key in ids:
                matched += 1
            else:
                unmatched.append(c)
        report["match_count"] = matched
        report["match_rate"] = round(matched / len(unique_ceids), 4) if unique_ceids else 0
        report["unmatched_ceid_samples"] = unmatched[:20]

    OUT_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {OUT_JSON}")


if __name__ == "__main__":
    main()