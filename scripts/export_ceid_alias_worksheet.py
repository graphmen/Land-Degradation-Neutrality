#!/usr/bin/env python3
"""CSV worksheet for GIS workshop — Q2 CEID alias fill-in."""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALIAS = ROOT / "public" / "reference-ceid-aliases.v0.1.json"
OUT_DIR = ROOT / "exports" / "steering-docx"
OUT_CSV = OUT_DIR / "CEID_ALIAS_WORKSHOP.csv"


def main() -> int:
    if not ALIAS.exists():
        print(f"Missing {ALIAS}; run: npm run build:ceid-aliases")
        return 1
    doc = json.loads(ALIAS.read_text(encoding="utf-8"))
    entries = doc.get("entries") or []
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fields = [
        "ceid",
        "category",
        "shapefile_id",
        "resolution",
        "notes",
        "approved_by",
        "approved_at",
    ]
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for e in entries:
            w.writerow({k: e.get(k, "") or "" for k in fields})
    print(f"Wrote {OUT_CSV} ({len(entries)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())