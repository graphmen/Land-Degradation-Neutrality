# 60-minute block discipline (EMA programme)

**Problem we are fixing:** Blocks were treated as “ship as much code as possible,” which **feels like rush** and **does not** match study-first, government-grade delivery. Finishing in ~20 minutes with many mixed commits is a **quality signal**, not efficiency.

---

## What one block is (and is not)

| A 60-minute block **is** | A 60-minute block **is not** |
|--------------------------|------------------------------|
| One **declared outcome** agreed at block start | A grab-bag of commits |
| **Study / design / review** time budgeted first | Dashboard tweaks to look busy |
| One **BLOCK_REVIEW_*.md** the steering group can read once | Silent pushes you discover later |
| Optional **one** focused commit **matching** the outcome | “Fix + feat + docs + UI” in one push |

**Minimum time shape (guidance, not timer pedantry):**

| Minutes | Activity |
|--------:|----------|
| 0–15 | Read principles, annex, or international dossier — **no code** |
| 15–25 | Write decision note (3–5 bullets): what we will / will not build this block |
| 25–50 | Implement **only** what the decision note allows |
| 50–60 | Block review file + **one** commit + push (if anything shipped) |

If study is not done in 15 minutes, **the block is study-only** — no code that hour.

---

## Block types (rotate — do not stack five “feat” blocks)

1. **Study** — country dossier, GPG/PRAIS section, EMA dataset metadata  
2. **Design** — UX module, schema, verification state (markdown/wireframe)  
3. **Data** — one corpus asset ingested with lineage (not “all zips”)  
4. **Build** — one vertical slice (e.g. verification table only)  
5. **Steering** — one-pager / minutes / checklist update  

**Rule:** After **two Build blocks**, next block must be **Study** or **Design**.

---

## Stop list (rushed patterns)

- ❌ Committing because “the hour ended” with unrelated files  
- ❌ Calling dashboard panels “transformation”  
- ❌ Patching Kobo/sync without steering decision  
- ❌ Skipping `BLOCK_REVIEW_*.md`  
- ❌ Starting a new feature before **Phase R1** UX is signed (web shell)  

---

## Current programme correction (2026-11-23)

**Today’s session:** Valid **foundation** (corpus register, dossiers, mobile ingest, ETL) — but **wrong pacing and wrong product story**. Docs amended (Guide v0.7): **National LDN Data Platform**, not dashboard.

**Next blocks (recommended order):**

1. **Study** — EMA reads `INTERNATIONAL_COUNTRY_DOSSIERS.md` + picks 2 peer countries for deep twinning  
2. **Design** — R1 wireframe: Evidence registry + Reporting desk (government IA)  
3. **Data** — One `important files/` layer: metadata register row + import plan only  
4. **Build** — Only after R1 sign-off: new government shell (not OAU chrome)  

---

## Accountability

Each `BLOCK_REVIEW_*.md` must state:

- **Block type** (Study / Design / Data / Build / Steering)  
- **Planned minutes vs actual** (honest)  
- **Outcome met?** yes / partial / no — and why  
- **Next block type** (pre-declared)

*Linked:* [REPOSITORY_WORKFLOW.md](./REPOSITORY_WORKFLOW.md) · [PROGRAMME_EXECUTION_STEPS.md](./PROGRAMME_EXECUTION_STEPS.md)