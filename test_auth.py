import urllib.request
import urllib.parse
import json
import base64

USERNAME = "vegris2020"
PASSWORD = "masasa2020"
auth = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth}", "Accept": "application/json"}

print("Trying to fetch token...")
req = urllib.request.Request("https://kf.kobotoolbox.org/token/?format=json", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        print("Success!", resp.read().decode())
except Exception as e:
    print("Token fetch failed:", e)

print("Trying other kobotoolbox domains...")
for domain in ["kobo.humanitarianresponse.info", "eu.kobotoolbox.org"]:
    req = urllib.request.Request(f"https://{domain}/token/?format=json", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Success on {domain}!", resp.read().decode())
    except Exception as e:
        print(f"Failed on {domain}:", e)
