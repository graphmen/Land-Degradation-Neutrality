#!/usr/bin/env python3
"""
Import EMA Laboratory Soil Organic Carbon (%) results from
`E.M.A SOIL ORGANIC CARBON ANALYSIS.xlsx` into:
  1. public/ema-lab-soc-register.json  (complete lab assay register)
  2. public/soil-modifications.json    (merges soc_percent & lab_number onto matched soil cores)

Usage:
  python scripts/import_lab_soc.py
  python scripts/import_lab_soc.py --excel "path/to/lab_soc.xlsx"
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_EXCEL = ROOT / "E.M.A SOIL ORGANIC CARBON ANALYSIS.xlsx"
SOIL_DATA_PATH = ROOT / "public" / "soil-data.json"
SOIL_MOD_PATH = ROOT / "public" / "soil-modifications.json"
LAB_REGISTER_PATH = ROOT / "public" / "ema-lab-soc-register.json"


def norm_token(val: object) -> str:
    if val is None:
        return ""
    s = str(val).strip().upper()
    s = re.sub(r"[\s\-]+", "_", s)
    return s


def extract_lab_rows(excel_path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    out: list[dict] = []
    for row in ws.iter_rows(values_only=True):
        if not row or len(row) < 4:
            continue
        item_no, lab_no, sample_ref, oc_val = row[0], row[1], row[2], row[3]
        if not isinstance(item_no, (int, float)) or not lab_no or not sample_ref:
            continue
        try:
            soc_pct = round(float(oc_val), 4) if oc_val is not None else None
        except (TypeError, ValueError):
            soc_pct = None
        ref_str = str(sample_ref).strip()
        parts = ref_str.split()
        ceid_raw = parts[0] if parts else ref_str
        district = " ".join(parts[1:]).title() if len(parts) > 1 else None
        out.append(
            {
                "item_no": int(item_no),
                "lab_number": str(lab_no).strip(),
                "sample_ref": ref_str,
                "ceid_token": ceid_raw,
                "ceid_norm": norm_token(ceid_raw),
                "district": district,
                "soc_percent": soc_pct,
                "source_file": excel_path.name,
            }
        )
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Import EMA Lab SOC Excel into Tier-2 soil cores")
    parser.add_argument("--excel", type=str, default=str(DEFAULT_EXCEL))
    args = parser.parse_args()

    excel_path = Path(args.excel)
    if not excel_path.exists():
        raise SystemExit(f"Lab SOC Excel file not found: {excel_path}")

    lab_rows = extract_lab_rows(excel_path)

    with open(SOIL_DATA_PATH, "r", encoding="utf-8") as f:
        soil_json = json.load(f)
    soil_records = soil_json.get("records", soil_json) if isinstance(soil_json, dict) else soil_json

    if SOIL_MOD_PATH.exists():
        with open(SOIL_MOD_PATH, "r", encoding="utf-8") as f:
            mod = json.load(f)
    else:
        mod = {"additions": [], "deletions": [], "edits": {}}

    mod.setdefault("additions", [])
    mod.setdefault("deletions", [])
    mod.setdefault("edits", {})

    # Build lookup index of soil record IDs by normalized CEID token
    by_ceid: dict[str, list[str]] = {}
    for rec in soil_records:
        rid = str(rec.get("_id") or rec.get("id") or rec.get("kobo_id") or "")
        if not rid:
            continue
        raw_ceid = rec.get("ceid") or rec.get("geninfo/ceid")
        if raw_ceid:
            nt = norm_token(raw_ceid)
            by_ceid.setdefault(nt, []).append(rid)

    matched_lab_rows = 0
    patched_soil_records = 0

    for entry in lab_rows:
        candidates = by_ceid.get(entry["ceid_norm"], [])
        entry["matched_soil_ids"] = candidates
        entry["matched"] = len(candidates) > 0
        if candidates:
            matched_lab_rows += 1
            for rid in candidates:
                existing = mod["edits"].get(rid, {})
                existing.update(
                    {
                        "soc_percent": entry["soc_percent"],
                        "lab_number": entry["lab_number"],
                        "lab_sample_ref": entry["sample_ref"],
                        "soc_source": entry["source_file"],
                        "data_tier": "tier2_national",
                    }
                )
                mod["edits"][rid] = existing
                patched_soil_records += 1

    register_payload = {
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "source_file": excel_path.name,
        "total_lab_assays": len(lab_rows),
        "matched_lab_assays": matched_lab_rows,
        "patched_soil_records": patched_soil_records,
        "records": lab_rows,
    }

    with open(LAB_REGISTER_PATH, "w", encoding="utf-8") as f:
        json.dump(register_payload, f, indent=2)

    with open(SOIL_MOD_PATH, "w", encoding="utf-8") as f:
        json.dump(mod, f, indent=2)

    print(
        f"Imported {len(lab_rows)} EMA lab SOC assays from {excel_path.name}: "
        f"{matched_lab_rows} matched ({patched_soil_records} soil core records updated)."
    )


if __name__ == "__main__":
    main()
