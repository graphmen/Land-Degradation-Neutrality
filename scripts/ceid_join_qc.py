#!/usr/bin/env python3
"""
CEID ↔ national LDN unit join QA (Step 2.1 prep).
Reads field CEIDs from public/ldn-data.json; compares to Combined shapefile Id.

Usage:
  python scripts/ceid_join_qc.py
  python scripts/ceid_join_qc.py --shp "path/to/Combined ldn shapefiles.shp"

Requires: stdlib + pyshp for shapefile stats (pip install pyshp).
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import Counter
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


def ceid_match_keys(ceid: str) -> dict[str, str | None]:
    """Candidate keys for steering — EMA must confirm one authoritative rule."""
    parts = ceid.split("_")
    suffix_after_first = ceid.split("_", 1)[1] if "_" in ceid else ceid
    return {
        "suffix_after_first_underscore": suffix_after_first,
        "second_segment": parts[1] if len(parts) >= 2 else None,
        "last_segment": parts[-1] if len(parts) >= 2 else None,
        "full_ceid": ceid,
        "first_segment": parts[0] if parts and parts[0].isdigit() else None,
    }


def load_shapefile_profile(shp: Path) -> tuple[set[str], dict]:
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
        idx_id = fields.index("Id")
        idx_ld = fields.index("LD") if "LD" in fields else None
        idx_area = fields.index("Area") if "Area" in fields else None

        ids: set[str] = set()
        areas: list[float] = []
        ld_vals: list[str] = []
        polygon_count = 0

        for rec in sf.iterRecords():
            polygon_count += 1
            val = rec[idx_id]
            if val is not None:
                ids.add(str(int(val)) if isinstance(val, (int, float)) else str(val).strip())
            if idx_area is not None and rec[idx_area] is not None:
                areas.append(float(rec[idx_area]))
            if idx_ld is not None and rec[idx_ld] is not None:
                ld_vals.append(str(rec[idx_ld]).strip())

    profile: dict = {
        "shapefile_fields": fields,
        "polygon_count": polygon_count,
        "unique_id_count": len(ids),
        "polygons_per_unique_id_mean": round(polygon_count / len(ids), 4) if ids else 0,
    }
    if areas:
        profile["area"] = {
            "min": round(min(areas), 6),
            "max": round(max(areas), 6),
            "mean": round(statistics.mean(areas), 6),
            "median": round(statistics.median(areas), 6),
            "unit_assumed": None,
            "steering_note": "Likely hectares for field-scale values; confirm Q1 with EMA.",
        }
    if ld_vals:
        profile["ld_class_counts"] = dict(Counter(ld_vals).most_common())

    return ids, profile


def match_strategy_counts(unique_ceids: list[str], ids: set[str]) -> dict:
    strategies = [
        "suffix_after_first_underscore",
        "second_segment",
        "last_segment",
        "first_segment",
        "full_ceid",
    ]
    out: dict[str, dict] = {}
    for name in strategies:
        matched = 0
        for c in unique_ceids:
            key = ceid_match_keys(c).get(name)
            if key and key in ids:
                matched += 1
        out[name] = {
            "match_count": matched,
            "match_rate": round(matched / len(unique_ceids), 4) if unique_ceids else 0,
        }
    return out


def unmatched_using_rule(unique_ceids: list[str], ids: set[str], rule: str) -> list[str]:
    bad = []
    for c in unique_ceids:
        key = ceid_match_keys(c).get(rule)
        if not key or key not in ids:
            bad.append(c)
    return bad


def classify_unmatched(ceid: str, ids: set[str], rule: str) -> dict:
    keys = ceid_match_keys(ceid)
    key = keys.get(rule)
    parts = ceid.split("_")
    if ceid.startswith("ZC") or ceid.startswith("ZE"):
        category = "legacy_zc_ze_token"
    elif "_" not in ceid:
        category = "named_or_short_token"
    elif len(parts) >= 3:
        category = "triple_segment"
    else:
        category = "double_segment_no_id_match"
    return {
        "ceid": ceid,
        "category": category,
        "join_key_tried": key,
        "first_segment_in_shapefile": (
            parts[0] in ids if parts and parts[0].isdigit() else False
        ),
        "second_segment_in_shapefile": (
            keys.get("second_segment") in ids if keys.get("second_segment") else False
        ),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shp", type=Path, default=None, help="Combined LDN shapefile")
    args = ap.parse_args()

    field = load_field_ceids()
    ceids = [f["ceid"] for f in field]
    unique_ceids = sorted(set(ceids))

    suffixes = [ceid_match_keys(c)["suffix_after_first_underscore"] for c in unique_ceids]

    report: dict = {
        "source": str(LDN_JSON),
        "field_records_with_ceid": len(field),
        "unique_ceids": len(unique_ceids),
        "ceid_format_samples": unique_ceids[:10],
        "suffix_numeric_count": sum(1 for s in suffixes if str(s).isdigit()),
        "shapefile_checked": False,
        "shapefile_profile": None,
        "match_strategies": None,
        "recommended_interim_rule": "second_segment",
        "match_count_recommended": None,
        "match_rate_recommended": None,
        "unmatched_ceid_samples": [],
        "unmatched_pattern_summary": {},
        "ema_questions": [
            "Q1: Confirm Area units on shapefile (hectares vs m²).",
            "Q2: Confirm Id ↔ CEID rule (ward_point vs point-only; ZC* / HP1 / named sites).",
            "Q3: Multiple polygons share one Id (~5.9 mean) — aggregate or explode for field join?",
        ],
    }

    shp = args.shp or (DEFAULT_SHP if DEFAULT_SHP.exists() else None)
    if shp and shp.exists():
        ids, profile = load_shapefile_profile(shp)
        report["shapefile_checked"] = True
        report["shapefile_path"] = str(shp)
        report["shapefile_id_count"] = profile["unique_id_count"]
        report["shapefile_profile"] = profile
        report["match_strategies"] = match_strategy_counts(unique_ceids, ids)

        rule = report["recommended_interim_rule"]
        rec = report["match_strategies"][rule]
        report["match_count_recommended"] = rec["match_count"]
        report["match_rate_recommended"] = rec["match_rate"]
        report["match_suffix_to_shapefile_id"] = {
            "rule": "suffix_after_first_underscore",
            **report["match_strategies"]["suffix_after_first_underscore"],
        }

        unmatched = unmatched_using_rule(unique_ceids, ids, rule)
        report["unmatched_count"] = len(unmatched)
        report["unmatched_ceid_samples"] = unmatched[:25]
        report["unmatched_ceids"] = unmatched
        details = [classify_unmatched(c, ids, rule) for c in unmatched]
        report["unmatched_details"] = details
        prefixes = Counter(d["category"] for d in details)
        report["unmatched_pattern_summary"] = dict(prefixes)

    OUT_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {OUT_JSON}")


if __name__ == "__main__":
    main()