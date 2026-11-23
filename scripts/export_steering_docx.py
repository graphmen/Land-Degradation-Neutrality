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
    ("STEERING_GIS_SO1_DECISION_PACK.md", "STEERING_GIS_SO1_DECISION_PACK.docx"),
    ("STEERING_MEETING_QUICK_BRIEF.md", "STEERING_MEETING_QUICK_BRIEF.docx"),
    ("STEERING_DECISIONS_QUEUE.md", "STEERING_DECISIONS_QUEUE.docx"),
    ("EMA_STEERING_ONE_PAGER.md", "EMA_STEERING_ONE_PAGER.docx"),
    ("ZIMBABWE_DIFFERENTIATOR_STEERING_ONE_PAGER.md", "ZIMBABWE_DIFFERENTIATOR_STEERING_ONE_PAGER.docx"),
]

OUT_DIR = ROOT / "exports" / "steering-docx"


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    for md_name, docx_name in PACK:
        md = PRINCIPLES / md_name
        if not md.exists():
            print(f"SKIP missing: {md}")
            continue
        out = OUT_DIR / docx_name
        try:
            convert_md_to_docx(str(md), str(out))
            ok += 1
        except PermissionError:
            alt = OUT_DIR / docx_name.replace(".docx", "_new.docx")
            convert_md_to_docx(str(md), str(alt))
            print(f"Wrote alternate (locked): {alt}")
            ok += 1
        except Exception as e:
            print(f"FAIL {md_name}: {e}")
    print(f"\n{ok}/{len(PACK)} documents in {OUT_DIR} (gitignored)")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())