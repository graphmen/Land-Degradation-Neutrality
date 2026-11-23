# Block review — Android UAT build + CEID validator API

| Mobile | `npm run build` + `cap sync android` OK (fix code-lists TS) |
| API | `GET /api/validator/ceid` + 43k unit index |

Open Android Studio: `mobile/android` · install APK on device.

Regen index after shapefile refresh: `python scripts/build_national_unit_index.py`