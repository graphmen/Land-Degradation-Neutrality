"""
Fetch and merge the Land Degradation Neutrality and Soil Samples Kobo forms and Google Sheets data.
"""
import urllib.request
import json
import base64
import os
import time

script_dir = os.path.dirname(os.path.abspath(__file__))

# Load env vars manually
def load_env():
    for f in [".env.local", ".env", "backend/.env"]:
        path = os.path.join(script_dir, f)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as file:
                for line in file:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        parts = line.split("=", 1)
                        key = parts[0].strip()
                        val = parts[1].strip().strip('"').strip("'")
                        if key not in os.environ:
                            os.environ[key] = val

load_env()

KOBO_URL = os.getenv("KOBO_API_URL", "https://kf.kobotoolbox.org/api/v2")
USERNAME = os.getenv("KOBO_USERNAME", "vegris2020")
PASSWORD = os.getenv("KOBO_PASSWORD", "musasa2020")
GOOGLE_SHEET_SCRIPT_URL = os.getenv("GOOGLE_SHEET_SCRIPT_URL")

FORMS = {
    "ldn": "apM5C5mTP34m2m3DSwdd4E",
    "soil": "ahkCvpctsofMKN4GzCH3BT"
}

auth = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth}", "Accept": "application/json"}

public_dir = os.path.join(script_dir, "public")
os.makedirs(public_dir, exist_ok=True)

def download_sheet_data():
    if not GOOGLE_SHEET_SCRIPT_URL:
        print("GOOGLE_SHEET_SCRIPT_URL not set. Skipping sheet data download.")
        return {"ldn": [], "soil": []}
    
    print(f"Downloading Google Sheets data from: {GOOGLE_SHEET_SCRIPT_URL}")
    try:
        req = urllib.request.Request(GOOGLE_SHEET_SCRIPT_URL, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Warning: Could not fetch Google Sheets data: {e}")
        return {"ldn": [], "soil": []}

def download_form_data(name, asset_id, sheet_records):
    records = []
    url = f"{KOBO_URL}/assets/{asset_id}/data/?format=json&limit=5000"
    page = 0
    print(f"Downloading {name} ({asset_id}) from Kobo...")
    
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
                print(f"  Got {len(batch)} Kobo records (total: {len(records)})")
    except Exception as e:
        print(f"Error downloading Kobo form {name}: {e}")
        
    print(f"Merging Google Sheets records for {name} ({len(sheet_records)} records)...")
    seen_ids = set()
    combined = []
    
    # Process Kobo records
    for r in records:
        rid = r.get("_id") or r.get("id")
        if rid:
            seen_ids.add(str(rid))
        combined.append(r)
        
    # Process Sheet records
    for r in sheet_records:
        rid = r.get("id") or r.get("_id")
        if not rid:
            rid = f"sheet_{name}_{int(time.time()*1000)}"
        if str(rid) not in seen_ids:
            seen_ids.add(str(rid))
            combined.append(r)
            
    try:
        out_path = os.path.join(public_dir, f"{name}-data.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"count": len(combined), "records": combined}, f, ensure_ascii=False)
        print(f"OK: Saved {len(combined)} combined records to {out_path}")
    except Exception as e:
        print(f"Error saving combined records for {name}: {e}")

# Fetch Google Sheets data first
sheet_data = download_sheet_data()

# Download and merge both
download_form_data("ldn", FORMS["ldn"], sheet_data.get("ldn", []))
download_form_data("soil", FORMS["soil"], sheet_data.get("soil", []))
