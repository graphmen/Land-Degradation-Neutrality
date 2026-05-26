from fastapi import APIRouter
from services.kobo import fetch_all_records, extract_geolocation
from collections import Counter
from typing import Dict, Any

router = APIRouter()

# Candidate field names for key metrics — matched against actual KoboToolbox fields
HABITAT_KEYS = ["habitat_type", "habitat", "land_use", "landuse", "vegetation_type", "environment"]
COLONY_KEYS = ["colony_size", "bat_count", "number_of_bats", "estimated_bats", "population_size", "count"]
DISTRICT_KEYS = ["lga", "district", "local_government", "location_name", "area", "site_name", "community"]
DATE_KEYS = ["today", "start", "date", "_submission_time"]
SPECIES_KEYS = ["tree_species", "roost_tree", "species", "plant_species", "host_tree"]


def find_field(record: Dict, candidates: list):
    for k in candidates:
        if k in record and record[k]:
            return k
    return None


@router.get("/summary")
async def get_summary():
    result = await fetch_all_records()
    records = result["records"]
    total = result["count"]

    if not records:
        return {"total": 0, "kpis": {}, "charts": {}}

    sample = records[0]

    # Detect field names
    habitat_field = find_field(sample, HABITAT_KEYS)
    colony_field = find_field(sample, COLONY_KEYS)
    district_field = find_field(sample, DISTRICT_KEYS)
    species_field = find_field(sample, SPECIES_KEYS)

    # If sample doesn't have them, scan more records
    for r in records[:20]:
        if not habitat_field:
            habitat_field = find_field(r, HABITAT_KEYS)
        if not colony_field:
            colony_field = find_field(r, COLONY_KEYS)
        if not district_field:
            district_field = find_field(r, DISTRICT_KEYS)
        if not species_field:
            species_field = find_field(r, SPECIES_KEYS)

    # Spatial count
    spatial_count = sum(
        1 for r in records if extract_geolocation(r)[0] is not None
    )

    # Habitat breakdown
    habitat_counts: Counter = Counter()
    if habitat_field:
        for r in records:
            val = r.get(habitat_field)
            if val:
                habitat_counts[str(val)] += 1

    # District breakdown
    district_counts: Counter = Counter()
    if district_field:
        for r in records:
            val = r.get(district_field)
            if val:
                district_counts[str(val)] += 1

    # Colony size stats
    colony_values = []
    if colony_field:
        for r in records:
            try:
                v = float(r.get(colony_field, 0) or 0)
                if v > 0:
                    colony_values.append(v)
            except (ValueError, TypeError):
                pass

    avg_colony = round(sum(colony_values) / len(colony_values), 1) if colony_values else 0
    total_bats = int(sum(colony_values))

    # Species breakdown
    species_counts: Counter = Counter()
    if species_field:
        for r in records:
            val = r.get(species_field)
            if val:
                species_counts[str(val)] += 1

    # Monthly submissions
    monthly: Counter = Counter()
    for r in records:
        for dk in DATE_KEYS:
            val = r.get(dk)
            if val and isinstance(val, str) and len(val) >= 7:
                month = val[:7]  # "YYYY-MM"
                monthly[month] += 1
                break

    return {
        "total": total,
        "spatial_count": spatial_count,
        "kpis": {
            "total_roosts": total,
            "mapped_roosts": spatial_count,
            "total_bats": total_bats,
            "avg_colony_size": avg_colony,
            "habitat_types": len(habitat_counts),
            "districts": len(district_counts),
        },
        "detected_fields": {
            "habitat": habitat_field,
            "colony": colony_field,
            "district": district_field,
            "species": species_field,
        },
        "charts": {
            "by_habitat": [{"name": k, "value": v} for k, v in habitat_counts.most_common(10)],
            "by_district": [{"name": k, "value": v} for k, v in district_counts.most_common(10)],
            "by_species": [{"name": k, "value": v} for k, v in species_counts.most_common(10)],
            "by_month": [{"month": k, "count": v} for k, v in sorted(monthly.items())],
        },
    }
