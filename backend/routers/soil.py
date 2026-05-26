import os
from fastapi import APIRouter, HTTPException
from services.kobo import fetch_records, get_field_names

router = APIRouter()

ASSET_ID = os.getenv("KOBO_SOIL_ASSET_ID", "ahkCvpctsofMKN4GzCH3BT")


@router.get("/soil")
async def get_soil_data(limit: int = 5000, offset: int = 0):
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
