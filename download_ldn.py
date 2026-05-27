"""
Fetch and inspect the Land Degradation Neutrality and Soil Samples Kobo forms.
"""
import urllib.request
import json
import base64
import os

KOBO_URL = "https://kf.kobotoolbox.org/api/v2"
USERNAME = "vegris2020"
PASSWORD = "musasa2020"

# Form 1: Land Degradation Neutrality (Asset: arkt5kjjuCk54d4JKQWxGj)
# Form 2: Soil Samples (Asset: ahkCvpctsofMKN4GzCH3BT)
FORMS = {
    "ldn": "apM5C5mTP34m2m3DSwdd4E",
    "soil": "ahkCvpctsofMKN4GzCH3BT"
}

auth = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth}", "Accept": "application/json"}

script_dir = os.path.dirname(os.path.abspath(__file__))
public_dir = os.path.join(script_dir, "public")
os.makedirs(public_dir, exist_ok=True)

def download_form_data(name, asset_id):
    records = []
    url = f"{KOBO_URL}/assets/{asset_id}/data/?format=json&limit=5000"
    page = 0
    print(f"Downloading {name} ({asset_id})...")
    
    try:
        while url:
            page += 1
            print(f"  Fetching page {page}...")
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                batch = data.get("results", [])
                records.extend(batch)
                url = data.get("next")
                print(f"  Got {len(batch)} records (total: {len(records)})")
                
        out_path = os.path.join(public_dir, f"{name}-data.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"count": len(records), "records": records}, f, ensure_ascii=False)
        print(f"OK: Saved {len(records)} records to {out_path}")
        
    except Exception as e:
        print(f"Error downloading {name}: {e}")
        if hasattr(e, 'read'):
            print(f"Response body: {e.read().decode('utf-8', errors='ignore')}")

# Download both
download_form_data("ldn", FORMS["ldn"])
download_form_data("soil", FORMS["soil"])
