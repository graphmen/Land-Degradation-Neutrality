import os
from fastapi import APIRouter, HTTPException
from services.kobo import fetch_records, get_field_names

router = APIRouter()

ASSET_IDS = [
    os.getenv("KOBO_SOIL_ASSET_ID", "ahkCvpctsofMKN4GzCH3BT"),
    "am3UGrEY8tYcnrMp3Xddys",
]


@router.get("/soil")
async def get_soil_data(limit: int = 5000, offset: int = 0):
    try:
        seen_ids = set()
        records = []
        for asset_id in ASSET_IDS:
            result = await fetch_records(asset_id)
            for record in result["records"]:
                rid = str(record.get("_id") or record.get("id") or "")
                if rid and rid in seen_ids:
                    continue
                if rid:
                    seen_ids.add(rid)
                records.append(record)

        return {
            "count": len(records),
            "records": records[offset: offset + limit],
            "fields": get_field_names(records),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
