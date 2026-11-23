#!/usr/bin/env python3
"""Merge GIS workshop CSV into reference-ceid-aliases.v0.1.json."""
from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = ROOT / "exports" / "steering-docx" / "CEID_ALIAS_WORKSHOP.csv"
ALIAS = ROOT / "public" / "reference-ceid-aliases.v0.1.json"


def stats(entries: list[dict]) -> dict:
    resolved = sum(1 for e in entries if e.get("resolution") == "approved" and e.get("shapefile_id"))
    retired = sum(1 for e in entries if e.get("resolution") == "retired")
    pending = sum(1 for e in entries if e.get("resolution") in (None, "pending_ema"))
    return {
        "total": len(entries),
        "resolved": resolved,
        "retired": retired,
        "pending_ema": pending,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    args = ap.parse_args()
    if not args.csv.exists():
        print(f"Missing {args.csv}; run npm run export:ceid-worksheet")
        return 1
    if not ALIAS.exists():
        print(f"Missing {ALIAS}; run npm run build:ceid-aliases")
        return 1

    doc = json.loads(ALIAS.read_text(encoding="utf-8"))
    by_ceid = {e["ceid"]: e for e in doc.get("entries") or []}

    with args.csv.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            ceid = (row.get("ceid") or "").strip()
            if not ceid:
                continue
            target = by_ceid.setdefault(
                ceid,
                {
                    "ceid": ceid,
                    "category": "unknown",
                    "shapefile_id": None,
                    "resolution": "pending_ema",
                    "notes": None,
                    "approved_by": None,
                    "approved_at": None,
                },
            )
            for key in ("category", "shapefile_id", "resolution", "notes", "approved_by", "approved_at"):
                val = (row.get(key) or "").strip()
                if val:
                    target[key] = val
            if target.get("shapefile_id") == "":
                target["shapefile_id"] = None

    doc["entries"] = sorted(by_ceid.values(), key=lambda e: e["ceid"])
    doc["statistics"] = stats(doc["entries"])
    doc["last_import_from_csv"] = str(args.csv.relative_to(ROOT)).replace("\\", "/")
    doc["last_import_at"] = datetime.now(timezone.utc).isoformat()
    if doc["statistics"]["resolved"] > 0:
        doc["status"] = "partial_ema_review"

    ALIAS.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    print(json.dumps(doc["statistics"], indent=2))
    print(f"Wrote {ALIAS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())