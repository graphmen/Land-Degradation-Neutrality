import os
from fastapi import APIRouter, HTTPException
from services.kobo import fetch_records, get_field_names

router = APIRouter()

ASSET_ID = os.getenv("KOBO_LDN_ASSET_ID", "apM5C5mTP34m2m3DSwdd4E")


@router.get("/ldn")
async def get_ldn_data(limit: int = 5000, offset: int = 0):
    try:
        result = await fetch_records(ASSET_ID)
        records = result["records"]
        return {
            "count": len(records),
            "records": records[offset: offset + limit],
            "fields": get_field_names(records),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
