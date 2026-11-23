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

    existing_by_ceid: dict[str, dict] = {}
    if OUT.exists():
        try:
            prev = json.loads(OUT.read_text(encoding="utf-8"))
            for e in prev.get("entries") or []:
                if e.get("ceid"):
                    existing_by_ceid[str(e["ceid"])] = e
        except json.JSONDecodeError:
            pass

    def stats(entries: list[dict]) -> dict:
        resolved = sum(
            1 for e in entries if e.get("resolution") == "approved" and e.get("shapefile_id")
        )
        retired = sum(1 for e in entries if e.get("resolution") == "retired")
        pending = sum(1 for e in entries if e.get("resolution") in (None, "pending_ema"))
        return {
            "total": len(entries),
            "resolved": resolved,
            "retired": retired,
            "pending_ema": pending,
        }

    entries = []
    for ceid in unmatched:
        meta = details.get(ceid, {})
        prior = existing_by_ceid.get(ceid)
        if prior and prior.get("resolution") in ("approved", "retired"):
            entries.append(prior)
            continue
        entries.append(
            {
                "ceid": ceid,
                "category": meta.get("category", prior.get("category") if prior else "unknown"),
                "shapefile_id": prior.get("shapefile_id") if prior else None,
                "resolution": prior.get("resolution", "pending_ema") if prior else "pending_ema",
                "notes": prior.get("notes") if prior else None,
                "approved_by": prior.get("approved_by") if prior else None,
                "approved_at": prior.get("approved_at") if prior else None,
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
        "statistics": stats(entries),
    }
    if doc["statistics"]["resolved"] > 0:
        doc["status"] = "partial_ema_review"
    OUT.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    st = doc["statistics"]
    print(f"Wrote {OUT} — total {st['total']}, resolved {st['resolved']}, pending {st['pending_ema']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())