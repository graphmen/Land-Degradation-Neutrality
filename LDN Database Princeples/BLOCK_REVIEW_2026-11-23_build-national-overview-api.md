# Block review — Build: national overview API (R2 preview)

| Item | Value |
|------|--------|
| **Block type** | Build |
| **Outcome met?** | **Yes** |
| **UI** | None — JSON only |

## Delivered

- `lib/national-overview.ts` + `GET /api/national-overview`
- Wireframe §4 fields: period, SO1 %, backlog, corpus health, steering action links
- Feature flag `ENABLE_NATIONAL_OVERVIEW_API=false` to disable

## Next

**Steering** — run R1 with DOCX + live overview API, or **Design** — evidence registry API shape.