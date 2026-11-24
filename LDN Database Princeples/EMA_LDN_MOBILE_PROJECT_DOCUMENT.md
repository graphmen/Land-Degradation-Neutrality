# EMA Zimbabwe National LDN Mobile Application — Project Document

**Document Type:** Project Specification & Implementation Plan  
**Programme:** Republic of Zimbabwe — National Land Degradation Neutrality (LDN) Programme (GEF 7 / UNCCD / FAO)  
**Custodian:** Environmental Management Agency (EMA), Zimbabwe  
**Application Identity:** `EMA Zimbabwe LDN` (`gov.zw.ema.ldn`)  
**Target Platforms:** Android (Primary Field Fleet) & iOS (TestFlight / Enterprise)  
**Date:** 2026-11-24  
**Version:** 1.0  

---

## 1. Executive Summary & Mandate

The **EMA Zimbabwe LDN Mobile Application** is the **sole authorized field data collection channel** for Zimbabwe’s national Land Degradation Neutrality (LDN) monitoring system, supporting **UNCCD SDG Indicator 15.3.1** and **PRAIS 4** national reporting.

Under EMA’s national data governance architecture:
- **Mobile Application (`mobile/`)** = authoritative **field capture & offline queue** for enumerators and provincial/district officers.
- **National LDN Web Platform (`app/`)** = system of record for **Evidence Registry, District/National Verification, Spatial Layers, SO1 Analytics, and PRAIS 4 Reporting** (read/verify/export only — no manual web entry of raw field surveys).

This separation guarantees end-to-end traceability from every GPS-tagged field observation and photograph directly into Zimbabwe’s locked PRAIS 4 submission tables.

---

## 2. Field Operating Context & Design Principles

Zimbabwe’s LDN field teams operate across rural dryland districts, communal lands, resettlement areas, and protected catchments where mobile connectivity is intermittent or absent. The application is engineered around five non-negotiable principles:

1. **Offline-First by Default:** Every form, reference code list, and administrative hierarchy works with zero internet connection. Submissions persist safely in on-device IndexedDB until synced.
2. **Government-Grade Visual Identity:** Consistent with the EMA National LDN Web Platform (EMA Forest Green `#043016`, Gold `#c9a227`, crisp `lucide-react` vector icons, high-contrast outdoor legibility).
3. **Standardized UNCCD Vocabulary:** All dropdowns and multi-selects are driven by **Annex F National Code Lists** (`reference-code-lists`), eliminating free-text spelling drift across districts.
4. **Geospatial & Photographic Proof:** Every record enforces GPS coordinate capture with accuracy warnings (`> 15 m`) and supports compressed field photography linked to the submission UUID.
5. **Audit-Ready Governance:** Every submission is automatically stamped with `uuid`, `code_list_version`, `data_tier`, `verification_status = submitted`, and enumerator identity before leaving the device.

---

## 3. Target Users & Roles

| Role | Mobile App Responsibilities | Web Platform Access |
|------|-----------------------------|---------------------|
| **Field Enumerator / Provincial Officer** | Captures LDN validations, Soil Cores, Drylands ILUP assessments, GPS pins, and photos offline; syncs queued drafts when online. | None (field collection only) |
| **District Verifier** | May collect field records in-district and verify submissions on web. | Verification Workspace (district queue) |
| **National Reporting Officer / GIS Lead** | Defines code lists, monitors CEID alignment, locks verified evidence, and exports PRAIS 4 packages. | Full National Platform |

---

## 4. Functional Scope & Data Capture Modules

### 4.1 Enumerator Profile & Field Home Hub (New — Sprint Day 1)
- **Persistent Enumerator Profile** (stored via `@capacitor/preferences`): Enumerator Name, Team ID, Default Province, Default District — automatically pre-filled into every new form to save time in the field.
- **Live Connectivity & Sync Banner:** Clear Online / Offline indicator, count of pending drafts, and one-tap **Sync Now**.
- **Quick-Launch Form Cards:** Direct access to all field collection modules and the offline Draft Queue.

### 4.2 Module 1 — LDN Field Validation (`LdnForm.tsx`, Annex A)
Captures ground-truth validation for Zimbabwe’s 254,873 national Collect Earth (CE) LDN units:
- **Administrative & Identification:** `measurement_date`, standardized **Province → District → Ward** selector, `Team`, Collect Earth ID (`ceid`) with live validation hint against `GET /api/validator/ceid` (including legacy alias awareness).
- **Spatial Capture:** Native GPS (`@capacitor/geolocation`) recording `lat`, `lng`, `altitude`, and `accuracy_m` with accuracy quality badge (`Good ≤ 10m`, `Fair 11–15m`, `Poor > 15m`).
- **Land Cover & Use (UNCCD 7-Class Harmonized):** `landcov` (national class mapped to UNCCD 7-class), `landus`, `use_spec`, baseline match check (`lndmat`), and mismatch explanation (`ex_mism`).
- **Degradation Indicators:** Vegetation cover (`veg_cov`), multi-select signs of erosion (`signs_ero`), tree/woody cover indicators (`tree`), overall severity rating (`sev`), and field notes (`oth`).
- **Photographic Evidence:** Native camera capture (`@capacitor/camera`) with client-side JPEG compression (`max 1280px`, ~75% quality) for reliable rural upload.

### 4.3 Module 2 — Soil Core Sampling (`SoilForm.tsx`, Annex A / SO1-3)
Captures Tier-2 physical soil horizon data and laboratory sample linkage for UNCCD SO1-3:
- **Site Metadata:** `measurement_date`, Province → District → Ward, `Team`, `ceid`.
- **Repeatable Multi-Horizon Cores (`cores[]`):** Supports 1 or more cores per site:
  - Sample location (`samloc`), GPS point (`poin`), **Core Depth (`dep` in cm, validating 0–30 cm UNCCD topsoil standard)**, Moisture condition (`moisture`), Munsell Soil Color (`col`), Soil Texture class (`tex`).
- **Laboratory Linkage (New — Sprint Day 2):** Optional `sample_ref` and `lab_number` fields captured at collection time so EMA laboratory Soil Organic Carbon (`%`) assay results join automatically on import.

### 4.4 Module 3 — Drylands & ILUP Assessment (`DrylandsForm.tsx`, Annex B)
Captures Integrated Land Use Planning (ILUP) vulnerability and restoration planning data:
- **Site & Administrative Context:** Observation date, Province → District → Ward, GPS coordinates, distance to road/settlement.
- **Degradation & Hazard Indicators:** Erosion type & severity (standardized Annex B codes), vegetation cover %, siltation evidence, recent veld fire, drought stress, flood proneness.
- **Land Use & Restoration Planning:** Land use compatibility, intervention priority level (`Low` / `Medium` / `High`), priority explanation, recommended SLM interventions (multi-select), and field photos.

### 4.5 Module 4 — Expansion Forms (Phase 2 Optional)
To make the mobile app a single unified tool for all EMA field operations, two lightweight capture forms can be enabled after core forms pass UAT:
- **Restoration Intervention Progress (`INT-PROJECTS` / `INT-SBC`):** Site GPS, intervention category, area restored (ha), beneficiaries, status, and verification photo.
- **Degradation Pressure Sighting (`PRESS-INVASIVE` / `PRESS-MINING`):** Site GPS, pressure theme (invasive species / illegal mining), species or activity type, estimated affected area, and photo (submitted as restricted national data).

### 4.6 Module 5 — Offline Draft Queue & Sync Manager (`DraftQueue.tsx`)
- Lists all locally stored drafts across all form types with status badges (`Draft`, `Pending Sync`, `Synced`, `Sync Failed`).
- Supports **edit before sync**, **delete draft**, **single-record sync**, and **Sync All Pending**.
- Displays explicit server error messages on failed items without losing local data.
- Prevents duplicate submissions via deterministic client-generated `uuid` / `submission_id`.

---

## 5. Technical Architecture

| Layer | Technology / Standard | Implementation Path |
|-------|-----------------------|---------------------|
| **UI Framework** | React 18, TypeScript, Vite | `mobile/src/` |
| **Native Runtime** | Capacitor 6 (`gov.zw.ema.ldn`) | `mobile/capacitor.config.ts`, `mobile/android/` |
| **Native Plugins** | `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/preferences`, `CapacitorHttp` | `mobile/package.json` |
| **Offline Storage** | Browser / WebView IndexedDB (`ema_ldn_field_db`) | `mobile/src/lib/db.ts` |
| **Code Lists** | Bundled UNCCD Annex F JSON (synced from web repo) | `mobile/public/reference-code-lists.v0.9.json` |
| **Admin Boundaries** | Bundled Zimbabwe Province → District → Ward lookup JSON | `mobile/public/zim-admin-hierarchy.json` (Sprint Day 2) |
| **Submission APIs** | `POST /api/submit/ldn`, `POST /api/submit/soil`, `POST /api/submit/drylands` | Web platform `app/api/submit/*` |
| **CEID Lookup API** | `GET /api/validator/ceid?ceid=...` | Web platform `app/api/validator/ceid/route.ts` |

### End-to-End Data Flow

```
[Field Device (Offline)]
  Enumerator captures LDN / Soil / Drylands + GPS + Photo
        │
        ▼ (Saved immediately to IndexedDB)
[Draft Queue (Pending Sync)]
        │
        ▼ (When online: HTTPS POST with UUID + Governance Metadata)
[EMA National LDN Platform API (/api/submit/*)]
        │
        ▼ (verification_status = "submitted")
[Verification Workspace (/verification)]
  District Verifier → National Reporting Officer → Locked
        │
        ▼ (Only "locked" records)
[UNCCD PRAIS 4 Reporting Desk (/reporting-desk)]
```

---

## 6. Data Governance, Quality & Security Controls

1. **Idempotent Submissions:** Every draft generates a stable `uuid` upon creation so network retries never create duplicate records on the server.
2. **GPS Quality Gate:** Submissions without valid coordinates (within Zimbabwe bounding box: lat `-22.5` to `-15.5`, lng `25.0` to `33.2`) are flagged before saving.
3. **Code List Version Stamping:** Every synced record carries `code_list_version` so historical records remain auditable if national vocabularies evolve.
4. **Photo Optimization:** Client-side canvas resizing caps image payload size (`≤ 350 KB` per photo) to protect device storage and enable reliable syncing over rural mobile networks.
5. **Post-Sync Immutability:** Once synced to EMA’s central platform, field records enter `submitted` state and cannot be altered silently; corrections follow the Annex E reject-and-resubmit workflow.
6. **Configurable Server Endpoint:** Production EMA/Vercel API URL is configured via `VITE_API_BASE_URL` (with an ICT settings override for staging/UAT testing).

---

## 7. Multi-Day Implementation Plan

| Sprint Day | Focus | Concrete Deliverables | Acceptance Criteria |
|------------|-------|-----------------------|---------------------|
| **Day 1** | **EMA Government UI & Field Home Hub** | Overhaul `App.tsx` & `index.css` to EMA Forest Green/Gold aesthetic; replace emojis with `lucide-react`; add **Field Home Hub** + persistent **Enumerator Profile**; remove legacy/telemetry naming (`ema_telemetry_db` → clean display labels). | App looks and feels like an official EMA government tool on 360px–430px viewports; profile auto-fills all forms. |
| **Day 2** | **Complete Capture & Zimbabwe Admin Selectors** | Bundle standardized **Province → District → Ward** JSON from our Zimbabwe boundaries; add GPS bounding-box + accuracy indicator (`≤ 15m`); add `sample_ref`/`lab_number` to `SoilForm`; verify all Annex A/B required fields across LDN, Soil, and Drylands. | Zero free-text district typos; all UNCCD Annex A/B fields captured; live CEID validation hint works online and degrades gracefully offline. |
| **Day 3** | **Offline Sync Hardening & Photo Compression** | Add client-side JPEG compression before saving photos to IndexedDB; upgrade `DraftQueue.tsx` with per-record sync status, error feedback, and automatic retry; verify exact payload alignment with `/api/submit/*`. | 10+ offline drafts with photos sync reliably over throttled network with zero duplicates and clear status feedback. |
| **Day 4** | **End-to-End Integration & Release Build** | Test live mobile submissions appearing in web `/evidence/registry` and `/verification` (with District/Ward, CEID, GPS pin, and Photos); configure production `VITE_API_BASE_URL`; run `npm run build:cap` and package signed **Android APK** (`EMA_Zimbabwe_LDN_Mobile.apk`) + verify iOS checklist. | Android APK installs cleanly on test device; submitted LDN, Soil, and Drylands records flow end-to-end into `/verification` and can be locked for PRAIS 4. |

---

## 8. UAT & Release Sign-Off Checklist

- [ ] **Android UAT** completed per [`mobile/UAT_ANDROID.md`](../mobile/UAT_ANDROID.md) (offline capture, GPS lock, camera photo, CEID validation, sync recovery).
- [ ] **Web Integration Check:** Newly synced mobile records display populated **District / Ward**, **CEID**, **GPS Map Pin**, and **Photo** inside `/evidence/registry` and `/verification`.
- [ ] **Production API URL:** Confirmed and compiled into release build (`VITE_API_BASE_URL`).
- [ ] **Android APK Artifact:** Built, signed, and archived for EMA provincial distribution.
- [ ] **iOS Release Track:** `npx cap add ios` + TestFlight build scheduled per [`mobile/UAT_IOS.md`](../mobile/UAT_IOS.md) once macOS/Apple Developer access is assigned.
