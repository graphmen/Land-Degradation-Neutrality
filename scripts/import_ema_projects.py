"""
Step 2.2 — Import EMA project points from important files/projects.zip
into public/ema-projects-import.json (staging for intervention_record).
"""
import json
import os
import struct
import zipfile
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP_PATH = os.path.join(ROOT, "important files", "projects.zip")
OUT_PATH = os.path.join(ROOT, "public", "ema-projects-import.json")
INNER = "ema_projects_combined_geog.zip"
DBF = "ema_projects_combined_geog.dbf"


def read_dbf_records(data: bytes):
    if len(data) < 32:
        return []
    nrec = struct.unpack("<I", data[4:8])[0]
    hlen = struct.unpack("<H", data[8:10])[0]
    rlen = struct.unpack("<H", data[10:12])[0]
    pos = 32
    fields = []
    while pos < hlen - 1:
        fn = data[pos : pos + 11].split(b"\x00")[0].decode("ascii", "replace").strip()
        flen = data[pos + 16]
        fields.append((fn, flen))
        pos += 32
    body = data[hlen:]
    rows = []
    for i in range(nrec):
        rec = body[i * rlen : (i + 1) * rlen]
        if rec[:1] == b"*":
            continue
        off = 1
        row = {}
        for fn, flen in fields:
            chunk = rec[off : off + flen]
            off += flen
            val = chunk.decode("ascii", "replace").strip()
            if val:
                try:
                    if fn in ("lat", "lon", "ward", "year_estab"):
                        row[fn] = float(val) if "." in val else int(val)
                    else:
                        row[fn] = val
                except ValueError:
                    row[fn] = val
        rows.append(row)
    return rows


def main():
    if not os.path.exists(ZIP_PATH):
        print("ERROR: missing", ZIP_PATH)
        return 1
    with zipfile.ZipFile(ZIP_PATH) as outer:
        inner_bytes = outer.read(INNER)
    import io

    with zipfile.ZipFile(io.BytesIO(inner_bytes)) as inner:
        dbf = inner.read(DBF)
    raw_rows = read_dbf_records(dbf)
    records = []
    for i, r in enumerate(raw_rows):
        records.append(
            {
                "_id": 200000 + i,
                "name": r.get("Name") or f"EMA project {i+1}",
                "category": r.get("activty") or "Restoration",
                "org": r.get("Role_of_em") or r.get("role") or "EMA",
                "admin_level": "Ward",
                "admin_area": f"Ward {r.get('ward', '')} — {r.get('village', '')}".strip(" —"),
                "ward": r.get("ward"),
                "village": r.get("village"),
                "year_established": r.get("year_estab"),
                "funding_source": r.get("funding_pa"),
                "lat": r.get("lat"),
                "lng": r.get("lon"),
                "status": "Recorded",
                "data_tier": "tier2_national",
                "_source": "ema_projects_shapefile",
                "_import_layer": "INT-PROJECTS",
            }
        )
    payload = {
        "count": len(records),
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "records": records,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(records)} EMA projects -> {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())