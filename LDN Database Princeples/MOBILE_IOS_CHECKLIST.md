# iOS build checklist (Phase 3.1 — Deliverable B)

**Updated:** 2026-11-23 (study block — parity with Android UAT)  
**Detail:** [`mobile/UAT_IOS.md`](../mobile/UAT_IOS.md) · [`MOBILE_PLATFORM_PARITY.md`](./MOBILE_PLATFORM_PARITY.md)

## Current repo status

| Item | Status |
|------|--------|
| Android Capacitor | ✅ `mobile/android` |
| iOS platform folder | ⬜ **Requires Mac** — `npx cap add ios` |
| Android UAT script | ✅ [`mobile/UAT_ANDROID.md`](../mobile/UAT_ANDROID.md) |
| iOS UAT / TestFlight script | ✅ [`mobile/UAT_IOS.md`](../mobile/UAT_IOS.md) |

## Prerequisites

| Item | Owner |
|------|--------|
| Apple Developer account | EMA ICT |
| Mac + Xcode 15+ | Field / contractor |
| `VITE_API_BASE_URL` production HTTPS | [`MOBILE_API_DEPLOY.md`](./MOBILE_API_DEPLOY.md) |
| Code lists synced before release | `npm run sync:mobile-codes` |

## macOS commands (summary)

```bash
cd mobile && npm install && npm install @capacitor/ios@^6
npm run build && npx cap sync ios && npx cap open ios
```

## Windows / CI lane (until Mac)

- Android: `npm run build` + `npx cap sync android` (see UAT_ANDROID)  
- Programme tracks **3.1** blocked on Mac; backend/mobile API work continues  

## API acceptance (both platforms)

See UAT_IOS §2 — submit, CEID validator, status, offline sync.

## TestFlight gate

- [ ] Archive uploaded to App Store Connect  
- [ ] Internal testers complete UAT_IOS script  
- [ ] Build recorded in steering minutes  

## Steering export (optional)

Government briefing copies of programme docs: root [`convert_to_docx.py`](../convert_to_docx.py) (markdown → Word); not required for TestFlight.