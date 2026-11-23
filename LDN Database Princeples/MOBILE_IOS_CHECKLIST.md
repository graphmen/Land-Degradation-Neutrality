# iOS build checklist (Phase 3.1 — Deliverable B)

**Current repo:** Android Capacitor project present · **iOS platform not generated** (requires macOS).

## Prerequisites

| Item | Status |
|------|--------|
| Apple Developer account | EMA ICT |
| Mac with Xcode 15+ | Field team or contractor |
| `VITE_API_BASE_URL` production host | [`MOBILE_API_DEPLOY.md`](./MOBILE_API_DEPLOY.md) |

## Commands (on Mac, after `mobile` deps installed)

```bash
cd mobile
npm install
npm install @capacitor/ios@^6
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

In Xcode: set signing team, bundle id `gov.zw.ema.ldn`, enable Camera + Location usage strings in `Info.plist`.

## Windows / CI lane

- **Android UAT (verified):** `cd mobile && npm run build && npx cap sync android` → open `mobile/android` in Android Studio.
- Sync code lists: `node scripts/sync_mobile_code_lists.mjs`
- Track iOS in programme step **3.1** until Mac build completes.

## Test plan

1. Offline draft save (IndexedDB)  
2. Sync to `/api/submit/ldn` on national HTTPS host  
3. Confirm `governance` fields in API response  
4. TestFlight internal group (iOS) or sideload APK (Android)