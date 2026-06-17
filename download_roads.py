import os
import json
import urllib.request
import urllib.parse

points_file = r"c:\Users\ndebelem.ZINGSERVER1\Desktop\2026\OAU\mobile\public\validator\preloaded_points.geojson"
output_file = r"c:\Users\ndebelem.ZINGSERVER1\Desktop\2026\OAU\mobile\public\validator\preloaded_roads_raw.geojson"

if not os.path.exists(points_file):
    print(f"Error: Preloaded points file not found at {points_file}")
    exit(1)

with open(points_file, 'r', encoding='utf-8') as f:
    geojson = json.load(f)

# Find bounding box
min_lat = 90
max_lat = -90
min_lng = 180
max_lng = -180

for feature in geojson['features']:
    geom = feature['geometry']
    if geom['type'] == 'Point':
        lng, lat = geom['coordinates']
        min_lat = min(min_lat, lat)
        max_lat = max(max_lat, lat)
        min_lng = min(min_lng, lng)
        max_lng = max(max_lng, lng)

# Add a generous buffer (~5km in degrees is about 0.05)
BUFFER = 0.05
min_lat -= BUFFER
max_lat += BUFFER
min_lng -= BUFFER
max_lng += BUFFER

print(f"BBox found: lat: ({min_lat:.5f} to {max_lat:.5f}), lng: ({min_lng:.5f} to {max_lng:.5f})")

bbox_str = f"{min_lat:.5f},{min_lng:.5f},{max_lat:.5f},{max_lng:.5f}"

# Query Overpass API for all roads, tracks, paths
overpass_query = f"""[out:json][timeout:180];
(
  way["highway"~"^(motorway|white|trunk|primary|secondary|tertiary|unclassified|residential|road|track|path|footway|bridleway|service|living_street|pedestrian)$"]({bbox_str});
);
out body;
>;
out skel qt;"""

overpass_url = "https://overpass-api.de/api/interpreter"

print("Querying Overpass API...")
data = urllib.parse.urlencode({'data': overpass_query}).encode('utf-8')
req = urllib.request.Request(overpass_url, data=data, headers={'User-Agent': 'LDN-Validator-Preloader'})

try:
    with urllib.request.urlopen(req) as response:
        response_data = json.loads(response.read().decode('utf-8'))
except Exception as e:
    print(f"Error querying Overpass API: {e}")
    exit(1)

elements = response_data.get('elements', [])
print(f"Downloaded {len(elements)} elements from OSM.")

# Build lookup node coordinates map
node_map = {}
for el in elements:
    if el.get('type') == 'node':
        node_map[el['id']] = [el['lon'], el['lat']]

# Build road features
road_features = []
for el in elements:
    if el.get('type') != 'way':
        continue
    nodes = el.get('nodes', [])
    if len(nodes) < 2:
        continue
    
    coords = [node_map[n_id] for n_id in nodes if n_id in node_map]
    if len(coords) < 2:
        continue
        
    tags = el.get('tags', {})
    road_features.append({
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": coords
        },
        "properties": {
            "highway": tags.get('highway', 'unknown'),
            "name": tags.get('name', tags.get('name:en', '')),
            "surface": tags.get('surface', ''),
            "osm_id": el['id']
        }
    })

roads_geojson = {
    "type": "FeatureCollection",
    "features": road_features
}

print(f"Converted into {len(road_features)} road features.")

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(roads_geojson, f, indent=2)

print(f"Saved preloaded roads GeoJSON to: {output_file}")
