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

Copy `.env.example` → `.env.production` with national HTTPS `VITE_API_BASE_URL`.

## Test script

1. Create LDN draft — blur CEID to see national LD hint (requires API + network).  
2. Sync draft from Queue tab — check `governance` in API logs.  
3. Offline: save draft without sync; reconnect and sync.

## APK

Android Studio → Build → Build Bundle(s) / APK(s) → APK for sideload to field tablets.