# EMA Zimbabwe National LDN Mobile Field Suite — Project Document

**Document Type:** Modular Architecture Specification & Implementation Roadmap  
**Programme:** Republic of Zimbabwe — National Land Degradation Neutrality (LDN) Programme (GEF 7 / UNCCD / FAO)  
**Custodian:** Environmental Management Agency (EMA), Zimbabwe  
**Application Identity:** `EMA Zimbabwe LDN` (`gov.zw.ema.ldn`)  
**Target Platforms:** Android (Primary Field Fleet) & iOS (TestFlight / Enterprise)  
**Date:** 2026-11-24  
**Version:** 2.0 (Modular SO1–SO5 Field Reporting Suite)

---

## 1. Executive Summary & Mandate

Following completion of Zimbabwe’s initial Collect Earth validation campaign, the **EMA Zimbabwe LDN Mobile Application** has been architected as a **modular, extensible national LDN field reporting suite** supporting all **UNCCD Strategic Objectives (SO1–SO5)**, **SDG Indicator 15.3.1**, **PRAIS 4** national reporting, and ongoing EMA environmental compliance operations.

Under EMA’s national data governance architecture:
- **Mobile Field Suite (`mobile/`)** = authoritative **offline-first capture channel** for provincial/district officers, partner NGOs, and enumerators.
- **National LDN Web Platform (`app/`)** = system of record for **Evidence Registry, District/National Verification, National Spatial Layers, SO1 Analytics, and PRAIS 4 Reporting**.

Every submission from any module — current or future — flows through a standardized **`UniversalSubmission` JSON envelope** (`POST /api/submit/modular`) directly into the web platform’s Evidence Registry, Verification Queues, and National Spatial Map.

---

## 2. Core Design Principles

1. **Modular & Extensible by Design:** New EMA field forms (e.g., Wetlands Health, Catchment Rehabilitation, Drought Early Warning, Forestry Nurseries) register in `MODULE_REGISTRY` (`mobile/src/lib/submission-envelope.ts`) and automatically inherit offline IndexedDB storage, GPS/Polygon capture, photo attachment, and universal API sync without rewriting core infrastructure.
2. **Point GPS & Polygon Walk-Recording:** Officers can record either a single GPS pin or **walk the perimeter of a site** (Auto-Walk every 5s or manual vertices) with live **geodesic hectare (`area_ha`) & perimeter (`perimeter_m`)** calculation, miniature SVG preview, GPS accuracy badge, and Zimbabwe bounding-box validation.
3. **Offline-First Resilience:** All forms, UNCCD Annex F code lists, and admin hierarchies work with zero connectivity. Submissions persist locally in IndexedDB (`ema_ldn_modular_db` & `ema_telemetry_db`) until synced.
4. **Government-Grade Visual Identity:** Consistent with the EMA National LDN Web Platform (EMA Forest Green `#043016`, Gold `#c9a227`, crisp `lucide-react` vector icons, outdoor legibility).
5. **Audit-Ready Governance & RBAC Sensitivity:** Every record is stamped with `submission_id` (UUID), `module_id`, `reporting_period`, `code_list_version`, `verification_status = submitted`, and `sensitivity` (`standard` or `restricted`, e.g., Illegal Mining).

---

## 3. Active Field Modules (Release 2.0)

| # | Module ID | Module Name | UNCCD Alignment | Spatial Capture | Status |
|---|-----------|-------------|-----------------|-----------------|--------|
| 1 | `so1_land_cover` | **Land Cover & Degradation** (`LdnForm.tsx`) | SO1-1 / SO1-2 | Point GPS + Polygon Walk (ha) | Active |
| 2 | `so1_soil_soc` | **Soil Health & Lab SOC** (`SoilForm.tsx`) | SO1-3 (Tier-2) | Point GPS (0–30 cm cores + Lab Bag Tag / EMA Lab #) | Active |
| 3 | `pressures` | **Degradation Pressures** (`PressureForm.tsx`) | SO1-2 / SO2 Drivers | Point GPS + Polygon Walk (ha) · Auto-flags Illegal Mining `restricted` | Active |
| 4 | `so4_interventions` | **Restoration & Bright Spots** (`InterventionForm.tsx`) | SO4 / SO5 Counterbalancing | Point GPS + Polygon Walk (ha) · Avoid/Reduce/Reverse · Gender/Youth Beneficiaries | Active |
| 5 | `drylands_ilup` | **Drylands & ILUP** (`DrylandsForm.tsx`) | SO2 / SO3 Vulnerability | Point GPS + Multi-Photo | Active |

### Planned EMA Expansion Modules (Plug-in Ready via `MODULE_REGISTRY`)
- `wetlands_monitoring` — Wetland integrity, encroachment, and hydrological health
- `veld_fire_assessment` — Post-fire burnt area polygon mapping & biomass loss
- `community_nurseries` — Seedling production & survival tracking for SO4 reforestation
- `drought_early_warning` — UNCCD SO3 drought impact & community coping indicators

---

## 4. Technical Architecture

| Layer | Technology / Standard | Implementation Path |
|-------|-----------------------|---------------------|
| **UI Framework** | React 18, TypeScript, Vite | `mobile/src/` |
| **Native Runtime** | Capacitor 6 (`gov.zw.ema.ldn`) | `mobile/capacitor.config.ts`, `mobile/android/` |
| **Native Plugins** | `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/preferences`, `CapacitorHttp` | `mobile/package.json` |
| **Universal Envelope** | `UniversalSubmission`, `MODULE_REGISTRY`, `computePolygonMetrics` | `mobile/src/lib/submission-envelope.ts` |
| **Spatial Widget** | Reusable Point GPS + Polygon Walk Recorder | `mobile/src/components/GpsPolygonCapture.tsx` |
| **Offline Storage** | Schema-less IndexedDB (`ema_ldn_modular_db`) + legacy draft stores | `mobile/src/lib/modular-db.ts`, `mobile/src/lib/db.ts` |
| **Enumerator Profile** | Persistent officer profile auto-filling Province/District/Ward/Team | `mobile/src/lib/enumerator-profile.ts` |
| **Universal Web API** | Idempotent `GET` / `POST /api/submit/modular` (`submission_id` deduplication) | `app/api/submit/modular/route.ts` |
| **Web Integration** | Live ingestion into Evidence Registry, Verification Queues, & National Layers Map (Points + Polygons) | `lib/evidence-registry.ts`, `lib/verification-queues.ts`, `app/layers/page.tsx`, `components/GovPointMap.tsx` |

### End-to-End Data Flow

```
[Field Device (Offline)]
  Officer selects module from Home Hub (Land Cover / Soil SOC / Pressures / Restoration SO4 / Drylands)
  Captures Point GPS or Walks Polygon (auto-calculates ha) + Field Photos
        │
        ▼ (Saved immediately to IndexedDB)
[Offline Sync Queue (Pending)]
        │
        ▼ (When online: HTTPS POST /api/submit/modular with UniversalSubmission envelope)
[EMA National LDN Platform]
  ├── Evidence Registry (/evidence/registry) — searchable across all 5 modules
  ├── Verification Workspace (/verification) — District → National → Approved → Locked
  └── National Layers Map (/layers) — live Point pins & Walked Polygons (ha) with RBAC gating
        │
        ▼ (Only "locked" records)
[UNCCD PRAIS 4 Reporting Desk (/reporting-desk)]
```

---

## 5. Data Governance & Quality Controls

1. **Idempotent Sync:** Client-generated UUID (`submission_id`) prevents duplicate records across retries and poor rural connections.
2. **Spatial Quality Gate:** Every GPS fix checks Zimbabwe bounding coordinates (lat `-22.5` to `-15.5`, lng `25.0` to `33.2`) and displays accuracy quality (`Good ≤ 10 m`, `Fair 11–15 m`, `Poor > 15 m`).
3. **RBAC Sensitivity Tagging:** Illegal Mining pressure reports are automatically tagged `sensitivity: "restricted"`, hiding them from Public/Donor web views until viewed by an authorized National Reporting Officer or GIS Lead.
4. **Lab SOC Chain-of-Custody:** Soil Core submissions capture optional `sample_ref` (bag tag) and `lab_number` so EMA laboratory Soil Organic Carbon (`%`) results link seamlessly into Tier-2 SO1-3 exports.

---

## 6. Delivery Milestones & Release Checklist

- [x] **Milestone 1:** EMA Government UI, Field Home Hub, and persistent Enumerator Profile (`309cf02`).
- [x] **Milestone 2:** Universal Modular Architecture (`UniversalSubmission`, `MODULE_REGISTRY`, `ema_ldn_modular_db`), Point + Polygon Walk Recorder (`GpsPolygonCapture`), **Degradation Pressures** module, **Restoration SO4** module, and `POST /api/submit/modular` (`47a28b6`).
- [x] **Milestone 3:** Live Web Platform integration (Evidence Registry, Verification Queues, National Layers Map polygon rendering) + upgraded Land Cover (`LdnForm`) & Soil Lab SOC (`SoilForm`) modules.
- [ ] **Milestone 4:** Add any additional EMA-specified modules to `MODULE_REGISTRY` as requirements arrive from EMA technical working groups.
- [ ] **Milestone 5:** Confirm production `VITE_API_BASE_URL`, run `cd mobile && npm run build:cap`, and package signed **Android APK** (`EMA_Zimbabwe_LDN_Mobile.apk`) for provincial UAT per [`mobile/UAT_ANDROID.md`](../mobile/UAT_ANDROID.md).
