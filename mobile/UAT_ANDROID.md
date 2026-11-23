# Android UAT — EMA LDN mobile

## Build

```powershell
cd mobile
npm install
npm run build
npx cap sync android
```

Open **`android/`** in Android Studio → Run on device/emulator.

## Config

Copy `.env.example` → `.env.production` with national HTTPS `VITE_API_BASE_URL` (or LAN dev host for rehearsal).

---

## Test script

| # | Action | Pass |
|---|--------|------|
| 1 | Create LDN draft | Form saves locally |
| 2 | CEID `11268_17236` blur | Green-style hint: national LD class + polygon count |
| 2b | CEID `ZC2` blur | Message: legacy GIS alias **pending** (no fake polygon) |
| 3 | Queue → sync `POST /api/submit/ldn` | Response includes `governance` object |
| 4 | Offline draft → reconnect sync | No duplicate UUID |

**API smoke (tablet browser or curl):** same host as `VITE_API_BASE_URL` · see repo `npm run r1:smoke`.

---

## APK

Android Studio → Build → Build Bundle(s) / APK(s) → APK for sideload to field tablets.

*Spec:* [`LDN Database Princeples/design/MOBILE_CEID_VALIDATOR_SPEC.md`](../LDN Database Princeples/design/MOBILE_CEID_VALIDATOR_SPEC.md)