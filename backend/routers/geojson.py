from fastapi import APIRouter
from services.kobo import fetch_all_records, extract_geolocation
from typing import List, Dict, Any

router = APIRouter()


@router.get("/geojson")
async def get_geojson():
    result = await fetch_all_records()
    features: List[Dict[str, Any]] = []

    for record in result["records"]:
        lat, lng = extract_geolocation(record)
        if lat is None or lng is None:
            continue

        props = {k: v for k, v in record.items() if not k.startswith("_")}
        props["_id"] = record.get("_id")
        props["_submission_time"] = record.get("_submission_time")

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
            "properties": props,
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "total": len(features),
    }
