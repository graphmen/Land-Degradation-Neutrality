import os
import json
import xml.etree.ElementTree as ET

kml_files = {
    "1km buffer_towards_previous_LDN.kml": "1km Buffer",
    "20km_radius_ofLDN.kml": "20km Radius",
    "LDN-national_validation.kml": "National Validation",
    "Previous_LDN_data.kml": "Previous LDN Data"
}

base_dir = r"c:\Users\ndebelem.ZINGSERVER1\Desktop\2026\OAU\points"
output_file = r"c:\Users\ndebelem.ZINGSERVER1\Desktop\2026\OAU\mobile\public\validator\preloaded_points.geojson"

geojson = {
    "type": "FeatureCollection",
    "features": []
}

def clean_tag(tag):
    if '}' in tag:
        return tag.split('}', 1)[1]
    return tag

for kml_file, category in kml_files.items():
    path = os.path.join(base_dir, kml_file)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        continue
    
    print(f"\nProcessing KML: {kml_file} ({category})")
    tree = ET.parse(path)
    root = tree.getroot()
    
    # We want to traverse and find Placemarks
    # To handle namespace issues, we can traverse using iter()
    placemark_count = 0
    for placemark in root.iter():
        if clean_tag(placemark.tag) != 'Placemark':
            continue
            
        placemark_count += 1
        
        # Get ID
        p_id = placemark.attrib.get('id', '').strip()
        
        # Look for SimpleData/ExtendedData
        simple_data = {}
        for child in placemark.iter():
            tag = clean_tag(child.tag)
            if tag == 'SimpleData':
                name = child.attrib.get('name')
                if name:
                    simple_data[name.lower()] = child.text
            elif tag == 'name':
                simple_data['name_tag'] = child.text
        
        # Determine unique ID
        final_id = ""
        if 'id' in simple_data and simple_data['id']:
            final_id = simple_data['id'].strip()
        elif p_id:
            final_id = p_id
        elif 'name_tag' in simple_data and simple_data['name_tag']:
            final_id = simple_data['name_tag'].strip()
        else:
            final_id = f"{category.lower().replace(' ', '_')}_{placemark_count}"
            
        # Parse coordinates
        coordinates_str = ""
        geom_type = None
        
        # Find Point coordinates or Polygon coordinates
        for geom in placemark.iter():
            gt = clean_tag(geom.tag)
            if gt in ('Point', 'Polygon', 'LineString'):
                geom_type = gt
                coords_el = geom.find('.//{http://www.opengis.net/kml/2.2}coordinates')
                if coords_el is None:
                    # Try without namespace
                    for c in geom.iter():
                        if clean_tag(c.tag) == 'coordinates':
                            coords_el = c
                            break
                if coords_el is not None and coords_el.text:
                    coordinates_str = coords_el.text.strip()
                    break
        
        if not coordinates_str:
            # Let's search inside the placemark directly for coordinates if not found in geom traversal
            for c in placemark.iter():
                if clean_tag(c.tag) == 'coordinates':
                    coordinates_str = c.text.strip()
                    break
                    
        if not coordinates_str:
            print(f"Warning: No coordinates found for Placemark ID {final_id} in {kml_file}")
            continue
            
        # Parse coords based on geometry type
        try:
            if geom_type == 'Point' or not geom_type:
                # Expecting "lng,lat" or "lng,lat,alt"
                parts = coordinates_str.split(',')
                lng = float(parts[0])
                lat = float(parts[1])
                geometry = {
                    "type": "Point",
                    "coordinates": [lng, lat]
                }
            elif geom_type == 'Polygon':
                # Polygon coords is a sequence of spaces separated coords "lng,lat,alt lng,lat,alt ..."
                pairs = coordinates_str.split()
                ring = []
                for p in pairs:
                    parts = p.split(',')
                    if len(parts) >= 2:
                        ring.append([float(parts[0]), float(parts[1])])
                # Ensure closed ring
                if ring and ring[0] != ring[-1]:
                    ring.append(ring[0])
                geometry = {
                    "type": "Polygon",
                    "coordinates": [ring]
                }
            else:
                # Ignore non point/polygon for now
                continue
        except Exception as err:
            print(f"Error parsing coordinates '{coordinates_str}' for ID {final_id}: {err}")
            continue
            
        # Extract properties
        operator = simple_data.get('operator') or "Unknown"
        land_use_1 = simple_data.get('land_use_1') or "Forest"
        land_use_s = simple_data.get('land_use_s') or "Stable"
        
        # Build coordinates centroid for metadata
        if geometry["type"] == "Point":
            lng, lat = geometry["coordinates"]
        else:
            # Centroid of polygon
            coords = geometry["coordinates"][0]
            lng = sum(pt[0] for pt in coords) / len(coords)
            lat = sum(pt[1] for pt in coords) / len(coords)
            
        feature = {
            "type": "Feature",
            "properties": {
                "id": final_id,
                "category": category,
                "operator": operator,
                "land_use_1": land_use_1,
                "land_use_s": land_use_s,
                "location_x": lng,
                "location_y": lat
            },
            "geometry": geometry
        }
        geojson["features"].append(feature)

print(f"\nTotal preloaded features compiled: {len(geojson['features'])}")

# Write to file
os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, indent=2)
print(f"GeoJSON saved successfully to: {output_file}")
