"""
Run this script ONCE to download your KoboToolbox data locally.
Then run it again any time you want to refresh the data.

Usage:
    python download_data.py
"""
import urllib.request
import json
import base64
import os

KOBO_URL = "https://kf.kobotoolbox.org/api/v2"
ASSET_ID = "aKNhuHN8S3FUmXeGqi8C3H"
USERNAME = "oaubats"
PASSWORD = "oaubats"

auth = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth}", "Accept": "application/json"}

records = []
url = f"{KOBO_URL}/assets/{ASSET_ID}/data/?format=json&limit=5000"
page = 0

print("Downloading data from KoboToolbox...")

while url:
    page += 1
    print(f"  Fetching page {page}...")
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        batch = data.get("results", [])
        records.extend(batch)
        url = data.get("next")
        print(f"  Got {len(batch)} records (total so far: {len(records)})")

# Save to frontend/public so Next.js can serve it as a static file
script_dir = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(script_dir, "frontend", "public", "kobo-data.json")
os.makedirs(os.path.dirname(out_path), exist_ok=True)

with open(out_path, "w", encoding="utf-8") as f:
    json.dump({"count": len(records), "records": records}, f, ensure_ascii=False)

print(f"\nDone! {len(records)} records saved to:")
print(f"  {out_path}")
print("\nRefresh http://localhost:3001 to see the updated data.")

