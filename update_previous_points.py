"""
update_previous_points.py
─────────────────────────────────────────────────────────────────────────────
Replaces the "Previous LDN Data" features in:
    mobile/public/validator/preloaded_points.geojson
with the updated IDs (ZC*, ZE*, ZW* format) from:
    Previous Points.geojson

All other categories (1km Buffer, 20km Radius, National Validation) are kept
unchanged.  The output is written to BOTH:
    • mobile/public/validator/preloaded_points.geojson
    • mobile/dist/validator/preloaded_points.geojson   (built/deployed copy)
"""

import json
import os
import shutil

BASE_DIR      = r"c:\Users\ndebelem.ZINGSERVER1\Desktop\2026\OAU"
SRC_GEOJSON   = os.path.join(BASE_DIR, "Previous Points.geojson")
PRELOADED     = os.path.join(BASE_DIR, "mobile", "public", "validator", "preloaded_points.geojson")
DIST_COPY     = os.path.join(BASE_DIR, "mobile", "dist",   "validator", "preloaded_points.geojson")

# ── 1. Load new Previous Points file ────────────────────────────────────────
with open(SRC_GEOJSON, "r", encoding="utf-8") as f:
    new_prev = json.load(f)

print(f"Loaded {len(new_prev['features'])} features from 'Previous Points.geojson'")

# Build new "Previous LDN Data" features in the same schema used by app.js
# Skip features that have a null geometry (e.g. ZW10 without coordinates)
new_features = []
skipped = 0
for feat in new_prev["features"]:
    props = feat.get("properties", {})
    geom  = feat.get("geometry")

    # Skip null-geometry features
    if geom is None or geom.get("type") != "Point":
        print(f"  SKIP {props.get('Id', '?')} -- no valid Point geometry")
        skipped += 1
        continue

    lng, lat = geom["coordinates"]
    point_id = str(props.get("Id", "")).strip()

    # Map landcover to land_use_1 (closest match used by the validator)
    landcover = str(props.get("landcover", "")).lower()
    if "forest" in landcover:
        land_use_1 = "Forest"
    elif "cropland" in landcover:
        land_use_1 = "Cropland"
    elif "grassland" in landcover:
        land_use_1 = "Grassland"
    elif "bush" in landcover or "shrub" in landcover:
        land_use_1 = "Bush / Shrubland"
    elif "artificial" in landcover:
        land_use_1 = "Artificial / Settlement"
    else:
        land_use_1 = landcover.title() or "Unknown"

    new_features.append({
        "type": "Feature",
        "properties": {
            "id":         point_id,
            "category":   "Previous LDN Data",
            "operator":   "EMA Zimbabwe",
            "land_use_1": land_use_1,
            "land_use_s": "Stable",
            "location_x": lng,
            "location_y": lat
        },
        "geometry": {
            "type": "Point",
            "coordinates": [lng, lat]
        }
    })

print(f"  ✅ {len(new_features)} new 'Previous LDN Data' features built  ({skipped} skipped — no geometry)")

# ── 2. Load existing preloaded_points.geojson ────────────────────────────────
with open(PRELOADED, "r", encoding="utf-8") as f:
    preloaded = json.load(f)

before_count = len(preloaded["features"])
old_prev_count = sum(1 for f in preloaded["features"] if f["properties"].get("category") == "Previous LDN Data")
print(f"\nExisting preloaded_points.geojson:")
print(f"  Total features : {before_count}")
print(f"  Previous LDN   : {old_prev_count}  (will be replaced)")

# ── 3. Keep all non-Previous-LDN features intact ────────────────────────────
kept_features = [f for f in preloaded["features"] if f["properties"].get("category") != "Previous LDN Data"]
print(f"  Kept (other)   : {len(kept_features)}")

# ── 4. Merge: kept + new Previous LDN Data features ─────────────────────────
merged_features = kept_features + new_features
print(f"\nMerged total    : {len(merged_features)} features")

output_geojson = {
    "type": "FeatureCollection",
    "features": merged_features
}

# ── 5. Write back ────────────────────────────────────────────────────────────
with open(PRELOADED, "w", encoding="utf-8") as f:
    json.dump(output_geojson, f, indent=2)
print(f"\n✅ Written → {PRELOADED}")

# Also update the dist copy if it exists
if os.path.exists(os.path.dirname(DIST_COPY)):
    with open(DIST_COPY, "w", encoding="utf-8") as f:
        json.dump(output_geojson, f, indent=2)
    print(f"✅ Written → {DIST_COPY}")
else:
    print(f"ℹ  dist copy not found, skipped: {DIST_COPY}")

# ── 6. Summary ───────────────────────────────────────────────────────────────
from collections import Counter
categories = Counter(f["properties"]["category"] for f in merged_features)
print("\n── Category breakdown ──────────────────────────────────")
for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
    print(f"  {cat:<30} {count:>4} features")
print("────────────────────────────────────────────────────────")
print("Done.")
