# Annex D — Interventions and restoration evidence register

**Session:** 60-minute working draft  
**Date:** 2026-11-23  
**Status:** Draft — migrates demo data + EMA shapefiles into governed schema  
**Related assets:** `public/interventions-data.json`, `important files/projects.zip`, `important files/sbc.zip`, Drylands Annex B `recommended_interventions`

---

## D.1 Purpose

Document how **restoration and programme interventions** enter the national LDN database. Supports:

- **SO4** and implementation reporting narratives  
- **Counterbalancing** evidence (GPG Addendum) — spatially explicit improvement  
- Links between **drylands ILUP** recommendations and **on-the-ground projects**

**Canonical entity:** `intervention_record` (Project Guide §5.2).

---

## D.2 Current application state

| Source | Records | Storage | Maturity |
|--------|---------|---------|----------|
| Dashboard `/interventions` | 4 sample records | `interventions-data.json` + `interventions-modifications.json` | **Demo / placeholder** |
| EMA `projects.zip` | Not yet imported | Zip in `important files/` | **Production target** |
| SBC shapefiles | Not yet imported | `sbc.zip` | **Production target** |
| Drylands form | Checkbox interventions per site | `drylands_observation.interventions[]` | Field programme |

Sample record shape (JSON):

| Field | Example | DB column |
|-------|---------|-----------|
| `name` | Chivi Gullies Erosion Control | `title` |
| `category` | Erosion Control | `intervention_type` |
| `org` | EMA | `implementing_org` |
| `admin_level` / `admin_area` | District / Chivi | `admin_unit` |
| `size` | 45 ha | `extent_label` + numeric `area_ha` |
| `status` | Ongoing | `implementation_status` |
| `budget` | text | `funding_source` |
| `timeline` | text | `start_date`, `end_date` (parse) |
| `lat` / `lng` | point | `geometry` |
| `indicators` | object | `impact_indicators` (JSONB) |
| `evidence` | text | `evidence_narrative` |

---

## D.3 Mapping — Drylands recommended interventions → types

From Kobo ILUP (Annex B) — use as **code list** seed for `intervention_type`:

| Kobo value | UNCCD / national tag (draft) |
|------------|------------------------------|
| Vetiver planting | erosion_control |
| Contour ridges | erosion_control |
| Stone pitching | erosion_control |
| Gabions | erosion_control |
| Reforestation | land_restoration |
| Buffer demarcation | wetland_protection |
| Controlled grazing | sustainable_land_management |
| Alternative livelihoods | socio_economic |
| Road drainage improvement | infrastructure |

---

## D.4 Mapping — EMA projects shapefile (pending unpack)

| Step | Action |
|------|--------|
| 1 | Unpack `projects.zip` / `ema_projects_combined_geog.zip` |
| 2 | Document attribute dictionary (same format as Annex C §C.3) |
| 3 | Map to `intervention_record` + optional polygon geometry |
| 4 | Deduplicate against drylands recommendations by ward + intervention type |

---

## D.5 Compliance fields (all intervention records)

| Field | Requirement |
|-------|-------------|
| `uuid` | Stable identity |
| `reporting_period` | Nullable until assigned |
| `verification_status` | Submitted → verified → locked |
| `data_tier` | tier2_national for EMA projects |
| `geometry` | Point or polygon with CRS metadata |
| `land_type` | For counterbalancing — link to UNCCD land class |
| `evidence_attachments[]` | Photos, reports |

---

## D.6 EMA sign-off checklist

- [ ] Replace demo `interventions-data.json` with import from EMA projects or empty + DB-only.  
- [ ] Approve intervention type code list (ILUP + projects).  
- [ ] Define counterbalancing pilot linkage (one land type, one region).  
- [ ] Confirm budget / funding fields sensitivity for public dashboard.

---

## Document control

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-11-23 | Initial register from app JSON + EMA zip inventory |