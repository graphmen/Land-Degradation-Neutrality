#!/usr/bin/env python3
"""Batch markdown steering pack → Word (requires python-docx)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from convert_to_docx import convert_md_to_docx

PRINCIPLES = ROOT / "LDN Database Princeples"

PACK: list[tuple[str, str]] = [
    ("R1_STEERING_SIGN_OFF_PACK.md", "R1_STEERING_SIGN_OFF_PACK.docx"),
    ("STEERING_S1_S2_DECISION_PACK.md", "STEERING_S1_S2_DECISION_PACK.docx"),
    ("STEERING_GIS_SO1_DECISION_PACK.md", "STEERING_GIS_SO1_DECISION_PACK.docx"),
    ("STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.md", "STEERING_Q2_CEID_WORKSHOP_ONE_PAGER.docx"),
    ("STUDY_CEID_GRID_PEER_BENCHMARK.md", "STUDY_CEID_GRID_PEER_BENCHMARK.docx"),
    ("STUDY_SO1_NATIONAL_RASTER_DELIVERY.md", "STUDY_SO1_NATIONAL_RASTER_DELIVERY.docx"),
    ("STEERING_S5_REPORTING_PERIOD_ONE_PAGER.md", "STEERING_S5_REPORTING_PERIOD_ONE_PAGER.docx"),
    ("corpus/metadata/CEID_UNMATCHED_STUDY.md", "CEID_UNMATCHED_STUDY.docx"),
    ("corpus/metadata/CEID_JOIN_QC.md", "CEID_JOIN_QC.docx"),
    ("design/CEID_ALIAS_REGISTER.md", "CEID_ALIAS_REGISTER.docx"),
    ("STEERING_MEETING_QUICK_BRIEF.md", "STEERING_MEETING_QUICK_BRIEF.docx"),
    ("STEERING_DECISIONS_QUEUE.md", "STEERING_DECISIONS_QUEUE.docx"),
    ("EMA_STEERING_ONE_PAGER.md", "EMA_STEERING_ONE_PAGER.docx"),
    ("ZIMBABWE_DIFFERENTIATOR_STEERING_ONE_PAGER.md", "ZIMBABWE_DIFFERENTIATOR_STEERING_ONE_PAGER.docx"),
    ("R1_API_DEMO_SCRIPT.md", "R1_API_DEMO_SCRIPT.docx"),
    ("R1_CHAIR_RUN_OF_SHOW.md", "R1_CHAIR_RUN_OF_SHOW.docx"),
    ("STEERING_MINUTES_TEMPLATE_R1.md", "STEERING_MINUTES_TEMPLATE_R1.docx"),
    ("R1_POST_MEETING_PLAYBOOK.md", "R1_POST_MEETING_PLAYBOOK.docx"),
    ("R1_ATTENDEE_PACKET_INDEX.md", "R1_ATTENDEE_PACKET_INDEX.docx"),
    ("STEERING_S8_PRESSURE_ONE_PAGER.md", "STEERING_S8_PRESSURE_ONE_PAGER.docx"),
    ("design/VERIFICATION_LOCK_POLICY_V1.md", "VERIFICATION_LOCK_POLICY_V1.docx"),
    ("PROGRAMME_SESSION_SUMMARY_2026-11-23.md", "PROGRAMME_SESSION_SUMMARY_2026-11-23.docx"),
    ("corpus/CORPUS_QC_LINEAGE.md", "CORPUS_QC_LINEAGE.docx"),
]

BACKEND_PACK: list[tuple[str, str]] = [
    ("S2_APPLY_PREFLIGHT.md", "S2_APPLY_PREFLIGHT.docx"),
    ("SUPABASE_S2_STEERING_RUNBOOK.md", "SUPABASE_S2_STEERING_RUNBOOK.docx"),
]

OUT_DIR = ROOT / "exports" / "steering-docx"


def convert_one(md: Path, out: Path, label: str) -> bool:
    if not md.exists():
        print(f"SKIP missing: {md}")
        return False
    try:
        convert_md_to_docx(str(md), str(out))
        return True
    except PermissionError:
        alt = out.with_name(out.stem + "_new.docx")
        convert_md_to_docx(str(md), str(alt))
        print(f"Wrote alternate (locked): {alt}")
        return True
    except Exception as e:
        print(f"FAIL {label}: {e}")
        return False


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    backend = ROOT / "backend"
    ok = 0
    total = len(PACK) + len(BACKEND_PACK)
    for md_name, docx_name in PACK:
        if convert_one(PRINCIPLES / md_name, OUT_DIR / docx_name, md_name):
            ok += 1
    for md_name, docx_name in BACKEND_PACK:
        if convert_one(backend / md_name, OUT_DIR / docx_name, md_name):
            ok += 1
    print(f"\n{ok}/{total} documents in {OUT_DIR} (gitignored)")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())