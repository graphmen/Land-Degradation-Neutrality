from fastapi import APIRouter
from services.kobo import fetch_all_records, get_field_names

router = APIRouter()


@router.get("/data")
async def get_data(limit: int = 500, offset: int = 0):
    result = await fetch_all_records()
    records = result["records"]
    return {
        "count": result["count"],
        "records": records[offset: offset + limit],
        "fields": get_field_names(records),
    }


@router.get("/fields")
async def get_fields():
    result = await fetch_all_records()
    return {"fields": get_field_names(result["records"])}
