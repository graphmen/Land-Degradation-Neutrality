"""
Legacy Kobo schema export — deprecated for programme delivery (mobile-only).

Use public/reference-code-lists.v0.9.json and Annex field maps instead.
Credentials must be supplied via environment variables (never commit secrets).
"""
import base64
import json
import os
import urllib.request

KOBO_URL = os.environ.get("KOBO_API_URL", "https://kf.kobotoolbox.org/api/v2")
USERNAME = os.environ.get("KOBO_USERNAME", "")
PASSWORD = os.environ.get("KOBO_PASSWORD", "")

FORMS = {
    "ldn": os.environ.get("KOBO_LDN_ASSET_ID", "apM5C5mTP34m2m3DSwdd4E"),
    "soil": os.environ.get("KOBO_SOIL_ASSET_ID", "ahkCvpctsofMKN4GzCH3BT"),
}

script_dir = os.path.dirname(os.path.abspath(__file__))
public_dir = os.path.join(script_dir, "public")
os.makedirs(public_dir, exist_ok=True)


def download_schema(name, asset_id):
    if not USERNAME or not PASSWORD:
        print(
            f"Skip {name}: set KOBO_USERNAME and KOBO_PASSWORD to download legacy Kobo schemas."
        )
        return

    print(f"\nFetching schema for {name} ({asset_id})...")
    url = f"{KOBO_URL}/assets/{asset_id}/"
    auth = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
    headers = {"Authorization": f"Basic {auth}", "Accept": "application/json"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            survey_fields = data.get("content", {}).get("survey", [])
            fields = []
            for item in survey_fields:
                if item.get("type") not in [
                    "note",
                    "begin_group",
                    "end_group",
                    "begin_repeat",
                    "end_repeat",
                ]:
                    field_name = item.get("name", "unknown")
                    label = item.get("label", [field_name])
                    if isinstance(label, list) and len(label) > 0:
                        label = label[0]
                    fields.append(f"{field_name} ({item.get('type')}) - {label}")

            out_path = os.path.join(public_dir, f"{name}-schema.json")
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(
                    {"fields": fields, "raw_survey": survey_fields},
                    f,
                    indent=2,
                    ensure_ascii=False,
                )
            print(f"OK: {len(fields)} fields for {name} -> {out_path}")
    except Exception as e:
        print(f"Error downloading {name} schema: {e}")


if __name__ == "__main__":
    for form_name, asset_id in FORMS.items():
        download_schema(form_name, asset_id)