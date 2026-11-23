# Mobile production API URL (Deliverable B)

## Build-time variable

```env
# mobile/.env.production (do not commit secrets)
VITE_API_BASE_URL=https://YOUR-VERCEL-OR-GOV-HOST
```

No trailing slash. Used by `DraftQueue.tsx` for:

- `POST /api/submit/ldn`
- `POST /api/submit/soil`
- `POST /api/submit/drylands`

Legacy alias: `VITE_TELEMETRY_URL` (deprecated).

### Also used by mobile (read-only)

| Route | Use |
|-------|-----|
| `GET /api/validator/ceid` | CEID blur hint in `LdnForm` |
| `GET /api/status` | Smoke test / support |

CORS for Capacitor: root `middleware.ts` on `/api/*`.

## Builds

```powershell
cd mobile
Copy-Item .env.example .env.production
# Edit VITE_API_BASE_URL to production host
npm run build
```

## Checklist (Phase 3)

| Step | Done |
|------|------|
| HTTPS national host live | ☐ |
| CORS allows mobile origin (if PWA hosted separately) | ☐ |
| Submit routes return `governance` block | ✅ |
| Field tester confirms sync off corporate LAN | ☐ |

## Staging

Use same variable pointing at Vercel preview URL for internal TestFlight / APK trials.