# Study — Mobile platform parity (Android vs iOS)

**Block type:** Study · **Deliverable B** · **Not** a web UI task

---

## Scope

Both platforms are **the only** field submission channel. National dashboard is read/verify/export only until **R2** (post-R1).

---

## Feature parity matrix

| Capability | Android | iOS | Backend dependency |
|------------|---------|-----|-------------------|
| LDN / soil / drylands forms | ✅ Capacitor | 🔶 needs `cap add ios` | Code lists in `mobile/public` |
| Offline IndexedDB queue | ✅ | Same codebase | — |
| Sync `POST /api/submit/*` | ✅ UAT doc | Same | `MOBILE_API_DEPLOY` host |
| CEID blur → national LD hint | ✅ | Same | `GET /api/validator/ceid` |
| Legacy CEID (`ZC*`) pending message | ✅ 2026-11-23 | Same | `alias_status: pending_ema` |
| Governance fields on submit | ✅ API | Same | P1 compliance metadata |
| Photos attachment | ✅ | Same | Annex A fields |
| Pressure map (staging) | — | — | `GET /api/pressure-layers` (web/R1 later) |

---

## Release artefacts

| Platform | Doc | Build |
|----------|-----|-------|
| Android | [`mobile/UAT_ANDROID.md`](../mobile/UAT_ANDROID.md) | APK sideload |
| iOS | [`mobile/UAT_IOS.md`](../mobile/UAT_IOS.md) | TestFlight |

---

## Steering ask (optional)

- Nominate **iOS build owner** (Mac access by date)  
- Confirm bundle id + Apple Developer org  
- Same **production API URL** as Android fleet  

---

*Linked:* [`MOBILE_IOS_CHECKLIST.md`](./MOBILE_IOS_CHECKLIST.md) · [`PROGRAMME_EXECUTION_STEPS.md`](./PROGRAMME_EXECUTION_STEPS.md) §3.1