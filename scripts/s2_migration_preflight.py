#!/usr/bin/env python3
"""Local preflight for Supabase S2 Phase A+B (no remote SQL)."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIG = ROOT / "backend" / "migrations"
OUT = ROOT / "public" / "s2-migration-preflight.json"
CODE_LIST = ROOT / "public" / "reference-code-lists.v0.9.json"

PHASE_AB = [
    ("A", "001_reference_code_lists.sql", "S1"),
    ("A", "001_reference_code_lists_seed.sql", "S1"),
    ("B", "004_field_governance.sql", "S1"),
    ("B", "005_verification_log.sql", "S1"),
]

PHASE_CD = [
    ("C", "003_pressure_layers.sql", "S8"),
    ("D", "002_national_ldn_units.sql", "S3-S4"),
]


def file_meta(path: Path) -> dict:
    if not path.exists():
        return {"exists": False, "path": str(path.relative_to(ROOT))}
    data = path.read_bytes()
    return {
        "exists": True,
        "path": str(path.relative_to(ROOT)),
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "lines": data.count(b"\n") + (1 if data else 0),
    }


def main() -> int:
    phases = []
    blockers: list[str] = []
    all_ok = True

    for phase, name, gate in PHASE_AB + PHASE_CD:
        meta = file_meta(MIG / name)
        ready = meta.get("exists", False)
        if phase in ("A", "B") and not ready:
            all_ok = False
            blockers.append(f"Missing migration: {name}")
        entry = {
            "phase": phase,
            "file": name,
            "steering_gate": gate,
            "apply_in_s2_ab": phase in ("A", "B"),
            **meta,
        }
        phases.append(entry)

    code_lists = file_meta(CODE_LIST)
    if not code_lists.get("exists"):
        all_ok = False
        blockers.append("Missing public/reference-code-lists.v0.9.json (S1)")

    staging = {
        "pressure_points": (ROOT / "public" / "pressure-layers-staging.json").exists(),
        "sbc_points": (ROOT / "public" / "intervention-sbc-staging.json").exists(),
        "note": "Phase C uses pressure staging after 003; not imported to DB in preflight",
    }

    report = {
        "preflight_at": datetime.now(timezone.utc).isoformat(),
        "s2_decision": "S2",
        "phase_ab_ready": all_ok,
        "phase_ab_files": [p for p in phases if p["apply_in_s2_ab"]],
        "phase_cd_deferred": [p for p in phases if not p["apply_in_s2_ab"]],
        "code_list_seed_source": code_lists,
        "staging_present": staging,
        "blockers": blockers,
        "next_steps": [
            "Steering sign S1 (code lists v1.0)",
            "Supabase SQL editor: run Phase A then B files in order",
            "Run VERIFY_MIGRATIONS.sql sections 001, 004, 005",
            "node scripts/verify_supabase_schema.mjs (with env)",
        ],
        "runbook": "backend/SUPABASE_S2_STEERING_RUNBOOK.md",
    }

    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {OUT}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())