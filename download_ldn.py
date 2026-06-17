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
    "soil": "am3UGrEY8tYcnrMp3Xddys"
}

auth = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth}", "Accept": "application/json"}

public_dir = os.path.join(script_dir, "public")
os.makedirs(public_dir, exist_ok=True)

def generate_soil_organic_carbon_mapping():
    mapping = {}
    excel_path = os.path.join(script_dir, "E.M.A SOIL ORGANIC CARBON ANALYSIS.xlsx")
    if not os.path.exists(excel_path):
        print(f"Warning: Excel file not found at {excel_path}. Skipping SOC mapping.")
        return mapping
    
    try:
        import openpyxl
        print(f"Loading soil organic carbon analysis from: {excel_path}")
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        sheet = wb.active
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i < 4:  # skip header rows
                continue
            if len(row) < 4:
                continue
            item_no, lab_num, sample_ref, oc_val = row[:4]
            if sample_ref:
                sample_ref_str = str(sample_ref).strip()
                tokens = sample_ref_str.split()
                if not tokens:
                    continue
                ref_id = tokens[0]
                if ref_id not in mapping:
                    mapping[ref_id] = []
                
                try:
                    oc_float = float(oc_val) if oc_val is not None else None
                except ValueError:
                    oc_float = None
                    
                mapping[ref_id].append({
                    "lab_number": str(lab_num).strip() if lab_num is not None else "",
                    "sample_ref": sample_ref_str,
                    "organic_carbon": oc_float
                })
        
        # Save mapping to public/soil-organic-carbon.json
        out_path = os.path.join(public_dir, "soil-organic-carbon.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(mapping, f, ensure_ascii=False, indent=2)
        print(f"OK: Saved {len(mapping)} soil organic carbon mappings to {out_path}")
    except Exception as e:
        print(f"Warning: Failed to generate soil organic carbon mapping: {e}")
        
    return mapping

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

def download_form_data(name, asset_ids, sheet_records):
    if isinstance(asset_ids, str):
        asset_ids = [asset_ids]
        
    records = []
    
    for asset_id in asset_ids:
        url = f"{KOBO_URL}/assets/{asset_id}/data/?format=json&limit=5000"
        page = 0
        print(f"Downloading {name} ({asset_id}) from Kobo...")
        
        try:
            while url:
                page += 1
                print(f"  Fetching page {page} for asset {asset_id}...")
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    batch = data.get("results", [])
                    records.extend(batch)
                    url = data.get("next")
                    print(f"  Got {len(batch)} Kobo records (total: {len(records)})")
        except Exception as e:
            print(f"Error downloading Kobo form {name} ({asset_id}): {e}")
        
    print(f"Merging Google Sheets records for {name} ({len(sheet_records)} records)...")
    seen_ids = set()
    combined = []
    
    # Process Kobo records (with deduplication)
    for r in records:
        rid = r.get("_id") or r.get("id")
        if rid:
            rid_str = str(rid)
            if rid_str in seen_ids:
                continue
            seen_ids.add(rid_str)
        combined.append(r)
        
    # Process Sheet records
    for r in sheet_records:
        rid = r.get("id") or r.get("_id")
        if not rid:
            rid = f"sheet_{name}_{int(time.time()*1000)}"
        if str(rid) not in seen_ids:
            seen_ids.add(str(rid))
            combined.append(r)
            
    # Merge soil organic carbon if this is the soil dataset
    if name == "soil":
        try:
            soc_mapping = generate_soil_organic_carbon_mapping()
            if soc_mapping:
                print(f"Merging Soil Organic Carbon data into {len(combined)} records...")
                merged_count = 0
                for r in combined:
                    ceid = r.get("geninfo/ceid") or r.get("ceid")
                    if ceid:
                        ceid_str = str(ceid).strip()
                        if ceid_str in soc_mapping:
                            oc_list = soc_mapping[ceid_str]
                            sampl = r.get("sampl")
                            if isinstance(sampl, list):
                                merged_count += 1
                                for idx, s in enumerate(sampl):
                                    if idx < len(oc_list):
                                        s["lab_number"] = oc_list[idx]["lab_number"]
                                        s["sampl/lab_number"] = oc_list[idx]["lab_number"]
                                        s["organic_carbon"] = oc_list[idx]["organic_carbon"]
                                        s["sampl/organic_carbon"] = oc_list[idx]["organic_carbon"]
                                        s["sample_ref"] = oc_list[idx]["sample_ref"]
                                        s["sampl/sample_ref"] = oc_list[idx]["sample_ref"]
                print(f"Successfully merged Soil Organic Carbon data for {merged_count} matching soil records.")
        except Exception as merge_err:
            print(f"Error merging organic carbon mapping: {merge_err}")

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
download_form_data("soil", [FORMS["soil"], "ahkCvpctsofMKN4GzCH3BT"], sheet_data.get("soil", []))
