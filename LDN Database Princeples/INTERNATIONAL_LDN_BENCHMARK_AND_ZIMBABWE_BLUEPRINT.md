# International LDN benchmark & Zimbabwe national platform blueprint

**Purpose:** Answer the steering question: *“We are building a new government-grade national system, not a reskin of the old dashboard.”*  
**Status:** Draft v0.1 — for EMA steering **before** major UI build  
**Date:** 2026-11-23  
**Sources:** [PRAIS 4](https://www.unccd.int/resources/prais4-reporting-platform), [PRAIS 4 SO1 manual](https://prais4-reporting-manual.unccd.int/en/2026/SO1.html), UNCCD Tools4LDN/Trends.Earth, FAO LDN DSS (Bhutan, Central Asia, Uzbekistan geoportal pattern), Zimbabwe Project Guide §1.3 & workshop notes.

---

## 1. What other countries actually build (patterns, not copies)

| Pattern | Who uses it | Strength | Weakness (why Zimbabwe should not clone it) |
|---------|-------------|----------|-----------------------------------------------|
| **PRAIS 4 reporting portal** | All UNCCD Parties | Official SO1–SO5 tables, metadata, geospatial upload for reporting | **Reporting-only** — not daily EMA operations, field QA, or 254k CE polygons |
| **Trends.Earth + GEE** | Many countries (Tools4LDN) | SO1-1/2/3 gridded analytics, export packages | Desktop/cloud analytics — **not** national identity, verification, or mobile-first governance |
| **National LDN DSS (FAO/WOCAT)** | e.g. Bhutan, regional DSS | Decision support, land-cover transition analysis | Often **separate** from field apps and ministry geoportals |
| **LDN geoportal + field app** | e.g. Uzbekistan (17 thematic layers + Field Maps) | Integrated layers + systematic field/lab data | Heavy custom GIS; Zimbabwe already has EMA layers + Collect Earth scale |
| **Tiered evidence (GPG)** | Global standard | Tier 1 defaults → Tier 2 national → Tier 3 research | Many countries **stop at Tier 1** in PRAIS; weak field verification loop |

**Global standard core (non-negotiable for Zimbabwe):**

1. **SO1-4 / SDG 15.3.1** from three sub-indicators (land cover, land productivity, SOC).  
2. **Baseline (→2015) + reporting periods** — data tagged by period, not “one map forever.”  
3. **7-class land cover legend** (or documented national harmonization).  
4. **Metadata + lineage** on every dataset used in official tables (Annex II PRAIS).  
5. **Verification** before numbers enter the national report.  
6. **Separation:** field operations ≠ gridded SO1 analytics ≠ PRAIS export package (Guide §5.1).

---

## 2. Zimbabwe’s unfair advantages (why we can be *better*, not “another PRAIS clone”)

| Asset | International systems rarely have this together |
|-------|--------------------------------------------------|
| **~254k national LDN units** (Collect Earth / combined shapefile) | Field validation at **unit** scale |
| **150+ structured field validations + 632 soil cores + drylands ILUP** | Tier-2 evidence already in motion |
| **EMA spatial register** (projects, SBC, invasives, mining, monitoring sites) | Operational layers tied to interventions |
| **National mobile app mandate** (no Kobo for new work) | Single governed code list + form version |
| **Existing UNCCD training alignment** (Harare workshop, GPG addendum) | Reporting officer workflow can be designed in from day one |

**Zimbabwe differentiation thesis:**

> **“PRAIS tells the world what we report; EMA’s platform proves why we believe it.”**

- **PRAIS 4** = submission envelope (tables, maps, metadata).  
- **Zimbabwe National LDN Platform** = system of record for **evidence, verification, and ministry operations** that *feeds* PRAIS/Trends.Earth — with a **government-branded** experience, not a developer dashboard.

---

## 3. Proposed product split (replaces “one OAU-style app”)

Treat as **three products**, one national programme:

```
┌─────────────────────────────────────────────────────────────────┐
│  A. NATIONAL LDN DATA PLATFORM (government web — NEW UX)         │
│     Registry · Verification · Layers · Exports · Audit          │
├─────────────────────────────────────────────────────────────────┤
│  B. FIELD EVIDENCE APP (Android/iOS — existing mobile/)         │
│     LDN · Soil · Drylands · Validator · offline queue           │
├─────────────────────────────────────────────────────────────────┤
│  C. ANALYTICS & REPORTING ENGINE (Trends.Earth / batch jobs)   │
│     SO1 grids · period status · EXP-SO1-* packages for PRAIS      │
└─────────────────────────────────────────────────────────────────┘
```

**Today’s mistake:** We improved **B + APIs** while **A still looks like the 2024 telemetry dashboard.**  
**Correct sequencing:** Approve this blueprint → **design A for government** → migrate data under A; retire OAU chrome.

---

## 4. Government web UX — “totally new” information architecture

Proposed **primary navigation** (EMA official language, not dev menu labels):

| Module | User | Purpose |
|--------|------|---------|
| **National overview** | Ministers, steering, donors | Period status, SO1 headline, LDN counterbalance story, deadlines |
| **Evidence registry** | Reporting officer | All field submissions with verification state, tier, period |
| **Land cover & LDN units** | GIS + reporting | 254k units, CEID, stable/improved/degraded, harmonized legend |
| **Productivity & SOC** | GIS | National LPD layer, SOC tiers, links to soil cores |
| **Interventions & programmes** | Planning | 47+ EMA projects, spatial overlaps with degradation |
| **Drylands & ILUP** | Provincial teams | ILUP observations, erosion codes, ward narratives |
| **Monitoring network** | Field ops | 28+ sites register, gap analysis |
| **Verification workspace** | District / national reviewers | Queue: submitted → district → national → approved → **locked** |
| **Reporting desk** | Reporting officer | SO1 rehearsal checklist, export jobs, PRAIS handoff log |
| **Administration** | ICT / DBA | Code lists, roles, migrations, layer catalogue |

**Visual identity:** EMA / Government of Zimbabwe — not “Environmental Intelligence Hub” startup copy.  
**Tone:** Audit-ready, calm, document-centric; maps support decisions, they are not the whole UI.

---

## 5. Compliance checklist (every screen must answer)

| Question | Required UI element |
|----------|---------------------|
| Which **reporting period**? | Period selector on all analytics |
| Which **data tier**? | Badge: Tier 1 / 2 / 3 |
| Which **code list version**? | Footer + record detail |
| **Verification status**? | State machine visible on every field record |
| **Can this row go to PRAIS?** | “Reporting eligible” only when `approved` + `locked` |
| **Who changed it?** | Audit row (future `verification_log`) |

---

## 6. Benchmark scorecard — Zimbabwe target vs “typical Party”

| Capability | Typical Party (PRAIS + defaults) | Zimbabwe target (v1.0) |
|------------|----------------------------------|-------------------------|
| Field-to-report traceability | Weak | **Every PRAIS table row links to evidence IDs** |
| National polygon scale | Global 300m only | **254k CE units + field verify** |
| Mobile governance | Ad hoc forms | **Single code list + form_version_id** |
| Intervention spatial join | Rare | **EMA projects/SBC/mining/invasives live** |
| Verification workflow | Outside PRAIS | **In-platform district → national lock** |
| Drylands programme | Separate spreadsheets | **Same registry as LDN/soil** |

---

## 7. Revised delivery phases (study → design → build)

| Phase | Name | Output | Stop patching old UI? |
|-------|------|--------|------------------------|
| **R0** | **International study** (this doc + steering workshop) | Signed benchmark & blueprint | Yes — freeze cosmetic changes |
| **R1** | **UX / IA design** | Wireframes, EMA brand, module map | — |
| **R2** | **Schema & verification** | DB migrations applied, `verification_log` | Backend only |
| **R3** | **New shell build** | Replace `LayoutWrapper` + routes with gov modules | **New frontend** |
| **R4** | **Cutover** | Redirect `/ldn` → Evidence registry; JSON cache read-only | Retire OAU copy |
| **R5** | **Reporting rehearsal** | EXP-SO1-* → PRAIS dry run Nov 2026 | — |

**Work done today (2026-11-23)** maps to **R2 prep** (ETL, code lists, mobile submit, annexes) — **valid**, but **wrong order for your expectation of a visible government transformation.**

---

## 8. Immediate decisions for steering (assign to next 60-min block)

1. **Approve** product split §3 and navigation §4 (or edit names for EMA culture).  
2. **Commission** UI/IA sprint (R1) — government designer or EMA comms template.  
3. **Confirm** “new shell” is **in scope** (amends Guide §1.3 progressive enhancement for **web UX only**; keep mobile incremental).  
4. **Assign** reporting officer to own Verification workspace requirements.  
5. **Authorize** international deep-dive on 3 reference countries (suggested: **Bhutan** DSS process, **Uzbekistan** geoportal+field, **Mongolia or Kenya** Trends.Earth nationalization — to be documented in §9 annex).

---

## 9. Next research deliverable (agent assignment)

**Task:** Country dossiers (max 6 pages each) with:

- Institutional owner  
- Field app vs web vs PRAIS  
- Tiering model  
- Verification  
- What Zimbabwe should **adopt**, **adapt**, **avoid**

**Suggested countries:** Bhutan, Uzbekistan, Mongolia, Kenya, Türkiye, Germany (EU LDN reporting maturity).

**Output file:** `INTERNATIONAL_COUNTRY_DOSSIERS.md` (v0.1, one dossier per steering request).

---

## 10. One sentence for government

**Zimbabwe is building an EMA National Land Degradation Neutrality Platform that meets UNCCD/SDG 15.3.1 exactly, but adds province-to-PRAIS traceability, Collect Earth–scale validation, and governed mobile evidence — something most countries only assemble as disconnected tools.**

---

*Companion:* [ZIMBABWE_LDN_PROJECT_GUIDE.md](./ZIMBABWE_LDN_PROJECT_GUIDE.md) · [PROGRAMME_EXECUTION_STEPS.md](./PROGRAMME_EXECUTION_STEPS.md)