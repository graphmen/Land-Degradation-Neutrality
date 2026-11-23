# Q2 CEID workshop — one pager (GIS segment add-on)

**Duration:** 15 min · **Owner:** GIS lead + national reporting officer  
**Blocks:** PostGIS **002** (S3–S4) · mobile production CEID hint

---

## Decisions on the record

| ☐ | Decision |
|---|----------|
| ☐ | **Q2a** — Confirm default join rule: `second_segment` for `ward_point` numeric CEIDs |
| ☐ | **Q2b** — Approve [`reference-ceid-aliases.v0.1.json`](../public/reference-ceid-aliases.v0.1.json) as maintenance artefact |
| ☐ | **Q2c** — Assign officer to complete **54** pending alias rows |

---

## Evidence (live)

| Check | Command / URL |
|-------|----------------|
| Join rates | `npm run qc:ceid` |
| Alias draft | `npm run build:ceid-aliases` |
| Grid CEID | `GET /api/validator/ceid?ceid=11268_17236` |
| Legacy token | `GET /api/validator/ceid?ceid=ZC2` → `pending_ema` |
| Full register | `GET /api/config/ceid-aliases` |

---

## Worksheet (Excel)

```powershell
npm run export:ceid-worksheet
```

Writes `exports/steering-docx/CEID_ALIAS_WORKSHOP.csv` — GIS fills `shapefile_id`, set `resolution` to `approved` or `retired`, then commit JSON update in repo (or future DB seed).

---

## Categories to resolve (54)

| Category | Count | Examples |
|----------|------:|----------|
| `legacy_zc_ze_token` | 30 | ZC2…ZC29, ZE1… |
| `named_or_short_token` | 24 | HP1, Muchawona, PLR4 |

**Study detail:** [`corpus/metadata/CEID_UNMATCHED_STUDY.md`](./corpus/metadata/CEID_UNMATCHED_STUDY.md)

---

## After workshop

1. Update approved rows in `reference-ceid-aliases.v0.1.json`  
2. `npm run qc:ceid` — document new match rate in minutes  
3. Sign **Q2** in [`STEERING_DECISIONS_QUEUE.md`](./STEERING_DECISIONS_QUEUE.md)  
4. Unblock **LDN-NAT-ALL** load plan §3