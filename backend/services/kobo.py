import httpx
import time
import os
from typing import Optional, Tuple, List, Dict, Any

KOBO_API_URL = os.getenv("KOBO_API_URL", "https://kf.kobotoolbox.org/api/v2")
ASSET_ID = os.getenv("KOBO_ASSET_ID", "aKNhuHN8S3FUmXeGqi8C3H")
USERNAME = os.getenv("KOBO_USERNAME", "oaubats")
PASSWORD = os.getenv("KOBO_PASSWORD", "oaubats")

_cache: Dict = {"data": None, "timestamp": 0.0}
CACHE_TTL = 300  # 5 minutes


def normalize_fields(record: Dict) -> Dict:
    """Strip KoboToolbox group prefixes (e.g. 'group_xyz/field' -> 'field')"""
    normalized = {}
    for key, value in record.items():
        normalized[key] = value  # keep original
        if "/" in key and not key.startswith("_"):
            short_key = key.split("/")[-1]
            if short_key not in normalized:
                normalized[short_key] = value
    return normalized


def extract_geolocation(record: Dict) -> Tuple[Optional[float], Optional[float]]:
    """Try every known field pattern KoboToolbox uses for GPS"""
    # Standard KoboToolbox array
    geo = record.get("_geolocation")
    if geo and isinstance(geo, list) and len(geo) >= 2:
        try:
            return float(geo[0]), float(geo[1])
        except (TypeError, ValueError):
            pass

    # geopoint string: "lat lng alt acc"
    for key in ["GPS", "gps", "location", "geopoint", "coordinates", "geo_location"]:
        val = record.get(key)
        if val and isinstance(val, str):
            parts = val.split()
            if len(parts) >= 2:
                try:
                    return float(parts[0]), float(parts[1])
                except ValueError:
                    pass
    return None, None


async def fetch_all_records() -> Dict:
    now = time.time()
    if _cache["data"] and now - _cache["timestamp"] < CACHE_TTL:
        return _cache["data"]

    records: List[Dict] = []
    url = f"{KOBO_API_URL}/assets/{ASSET_ID}/data/?format=json&limit=5000"

    async with httpx.AsyncClient(timeout=60) as client:
        while url:
            resp = await client.get(url, auth=(USERNAME, PASSWORD))
            resp.raise_for_status()
            payload = resp.json()
            batch = payload.get("results", [])
            records.extend([normalize_fields(r) for r in batch])
            url = payload.get("next")

    result = {"count": len(records), "records": records}
    _cache["data"] = result
    _cache["timestamp"] = now
    return result


def get_field_names(records: List[Dict]) -> List[str]:
    """Return all unique non-private field names"""
    fields = set()
    for r in records[:20]:
        for k in r.keys():
            if not k.startswith("_"):
                fields.add(k)
    return sorted(fields)
