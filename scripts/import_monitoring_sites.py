"""
Import EMA reference monitoring sites from important files/Final Existing sites latest.xls
into public/reference-monitoring-sites.json for the national LDN database.
"""
import json
import os
from datetime import datetime, timezone

try:
    import xlrd
except ImportError:
    raise SystemExit("Install xlrd: pip install xlrd")

script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLS = os.path.join(script_dir, "important files", "Final Existing sites latest.xls")
OUT = os.path.join(script_dir, "public", "reference-monitoring-sites.json")


def normalize_district(raw: str) -> str:
    s = (raw or "").strip()
    mapping = {
        "Mash West": "Mashonaland West",
        "Mash East": "Mashonaland East",
        "Mash Central": "Mashonaland Central",
    }
    return mapping.get(s, s)


def main():
    if not os.path.exists(XLS):
        print(f"ERROR: missing {XLS}")
        return 1
    wb = xlrd.open_workbook(XLS)
    sh = wb.sheet_by_index(0)
    records = []
    current_district = ""
    for row in range(1, sh.nrows):
        d = sh.cell_value(row, 0)
        if d and str(d).strip():
            current_district = normalize_district(str(d).strip())
        loc = sh.cell_value(row, 1)
        lat = sh.cell_value(row, 2)
        lon = sh.cell_value(row, 3)
        if loc is None or str(loc).strip() == "":
            continue
        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (TypeError, ValueError):
            continue
        records.append({
            "id": len(records) + 1,
            "district": current_district,
            "site_name": str(loc).strip(),
            "lat": round(lat_f, 6),
            "lng": round(lon_f, 6),
            "source_file": os.path.basename(XLS),
        })
    payload = {
        "count": len(records),
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "layer_id": "REF-SITES",
        "records": records,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(records)} sites -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())