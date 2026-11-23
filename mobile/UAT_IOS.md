# iOS UAT / TestFlight — EMA LDN mobile (study lane)

**Prerequisite:** macOS + Xcode 15+ · Apple Developer (EMA ICT)  
**Android parity:** [`UAT_ANDROID.md`](./UAT_ANDROID.md)

---

## 1. Build (Mac)

```bash
cd mobile
npm install
npm install @capacitor/ios@^6
cp .env.example .env.production   # set VITE_API_BASE_URL to national HTTPS host
npm run build
npx cap add ios    # once
npx cap sync ios
npx cap open ios
```

**Xcode**

| Setting | Value |
|---------|--------|
| Bundle ID | `gov.zw.ema.ldn` (confirm with ICT) |
| Signing | EMA team |
| **Info.plist** | `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription` |

---

## 2. API smoke tests (same as Android)

With `VITE_API_BASE_URL` pointing at production or preview:

| # | Call | Pass |
|---|------|------|
| 1 | `POST /api/submit/ldn` (from Queue after draft) | governance in response |
| 2 | `GET /api/validator/ceid?ceid=11268_17236` (CEID blur in LdnForm) | grid match |
| 2b | Enter `ZC2` in form | amber “GIS alias pending” (no fake polygon) |
| 3 | `GET /api/status` | programme + `locked_ldn_exports` |
| 4 | Offline draft → reconnect sync | no duplicate UUID |

**CORS:** National API uses [`middleware.ts`](../middleware.ts) — Capacitor `capacitor://localhost` / HTTPS origins must reach `/api/*`.

---

## 3. TestFlight path

1. Xcode → Product → Archive  
2. Distribute → App Store Connect  
3. Internal testing group (EMA field + national QA)  
4. Attach [`UAT_IOS.md`](./UAT_IOS.md) test script as release notes  
5. Log build number in steering minutes (step **3.1**)

---

## 4. Parity checklist (iOS must match Android)

- [ ] Code lists synced: `npm run sync:mobile-codes` from repo root before release build  
- [ ] CEID national LD hint on blur  
- [ ] LDN / soil / drylands submit paths  
- [ ] IndexedDB offline queue  
- [ ] No Kobo as default sync target  

---

## 5. Blockers

| Blocker | Owner |
|---------|--------|
| No Mac in programme | Contractor / EMA ICT loaner |
| Production HTTPS URL | MOBILE_API_DEPLOY + Vercel/gov host |
| R1 not signed | Policy only — pilot APK/TestFlight still allowed |

*Programme:* [`../LDN Database Princeples/MOBILE_IOS_CHECKLIST.md`](../LDN%20Database%20Princeples/MOBILE_IOS_CHECKLIST.md)