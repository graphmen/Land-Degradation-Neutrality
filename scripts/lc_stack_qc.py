#!/usr/bin/env python3
"""LC t0/t1 stack check — delegates to national_raster_qc.py LC layer."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NATIONAL = ROOT / "scripts" / "national_raster_qc.py"


def main() -> int:
    cmd = [sys.executable, str(NATIONAL)]
    if "--checklist-only" in sys.argv:
        cmd.append("--checklist-only")
    else:
        cmd.extend(sys.argv[1:])
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())