import urllib.request
import json
import base64
import os

KOBO_URL = "https://kf.kobotoolbox.org/api/v2"
USERNAME = "vegris2020"
PASSWORD = "musasa2020"

FORMS = {
    "ldn": "apM5C5mTP34m2m3DSwdd4E",
    "soil": "ahkCvpctsofMKN4GzCH3BT"
}

auth = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth}", "Accept": "application/json"}

script_dir = os.path.dirname(os.path.abspath(__file__))
public_dir = os.path.join(script_dir, "public")
os.makedirs(public_dir, exist_ok=True)

def download_schema(name, asset_id):
    print(f"\nFetching schema for {name} ({asset_id})...")
    url = f"{KOBO_URL}/assets/{asset_id}/"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            
            # The actual survey questions are inside content -> survey
            survey_fields = data.get("content", {}).get("survey", [])
            
            # Extract just the field names and labels for easy reading
            fields = []
            for item in survey_fields:
                if item.get("type") not in ["note", "begin_group", "end_group", "begin_repeat", "end_repeat"]:
                    field_name = item.get("name", "unknown")
                    # Label can be a string or a list/dict depending on translations
                    label = item.get("label", [field_name])
                    if isinstance(label, list) and len(label) > 0:
                        label = label[0]
                    fields.append(f"{field_name} ({item.get('type')}) - {label}")
            
            out_path = os.path.join(public_dir, f"{name}-schema.json")
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump({"fields": fields, "raw_survey": survey_fields}, f, indent=2, ensure_ascii=False)
                
            print(f"OK: Found {len(fields)} fields for {name}. Saved schema to {out_path}")
            print(f"  First 5 fields: {fields[:5]}")
            
    except Exception as e:
        print(f"Error downloading {name} schema: {e}")
        if hasattr(e, 'read'):
            print(f"Response body: {e.read().decode('utf-8', errors='ignore')}")

download_schema("ldn", FORMS["ldn"])
download_schema("soil", FORMS["soil"])
