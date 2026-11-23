#!/usr/bin/env python3
"""Draft CEID alias register from qc-ceid-join-report (Design v0.1 — pending EMA)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "public" / "qc-ceid-join-report.json"
OUT = ROOT / "public" / "reference-ceid-aliases.v0.1.json"


def main() -> int:
    if not REPORT.exists():
        print(f"Missing {REPORT}; run npm run qc:ceid first")
        return 1
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    details = {d["ceid"]: d for d in report.get("unmatched_details") or []}
    unmatched = report.get("unmatched_ceids") or []

    entries = []
    for ceid in unmatched:
        meta = details.get(ceid, {})
        entries.append(
            {
                "ceid": ceid,
                "category": meta.get("category", "unknown"),
                "shapefile_id": None,
                "resolution": "pending_ema",
                "notes": None,
                "approved_by": None,
                "approved_at": None,
            }
        )

    doc = {
        "version": "0.1",
        "status": "draft_pending_ema",
        "default_join_rule": report.get("recommended_interim_rule", "second_segment"),
        "generated_from": "public/qc-ceid-join-report.json",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "steering_gate": "Q2",
        "entries": entries,
        "statistics": {
            "total": len(entries),
            "resolved": 0,
            "pending_ema": len(entries),
        },
    }
    OUT.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(entries)} pending aliases)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())