# Repository workflow — keep the workspace safe

After the **OAU folder was lost once**, treat Git as the safety net. Use this rhythm on every working day and after each **~60-minute block** — see **[BLOCK_DISCIPLINE_60MIN.md](./BLOCK_DISCIPLINE_60MIN.md)** (study-first; one outcome per block; no rush commits).

---

## After each session (5 minutes)

1. `git status` — know what changed (docs, code, data, `important files/`).
2. **Stage deliberately** — prefer themed commits (one annex, one fix), not one giant mixed commit.
3. **Commit** with a clear message: `docs: …`, `fix: …`, `feat: …`.
4. **Push** to `origin/main` when you have network (do not let commits sit only on the laptop).

```powershell
Set-Location "C:\Users\ndebelem.ZINGSERVER1\Desktop\2026\OAU"
git status
git add "LDN Database Princeples\ANNEX_B_DRYLANDS_FIELD_MAPPING.md"   # example
git commit -m "docs: complete Annex B drylands field mapping (draft)"
git push origin main
```

If push fails on SSL (corporate network):  
`git -c http.sslVerify=false push origin main` — only if EMA ICT allows it.

---

## What belongs in Git

| Include | Exclude / caution |
|---------|-------------------|
| Markdown + Word project docs | `.env`, `.env.local`, secrets |
| Annexes, work plan, README | Large personal dumps unrelated to LDN |
| `important files/` EMA layers (as provided) | `node_modules/`, `.next/` (ignored) |
| `public/*-schema.json`, small data samples | Regenerated `soil-organic-carbon.json` (ignored) |
| Code and migrations | Workshop PDF/PPTX if policy says keep offline only (currently `.gitignore`) |

---

## Annex session log

Update **[ANNEX_INDEX.md](./ANNEX_INDEX.md)** when an annex reaches a new version — then commit **index + annex** together.

---

## Recovery

If the folder is missing again:  
`git clone https://github.com/graphmen/Land-Degradation-Neutrality.git`  
→ restore to `Desktop\2026\OAU`, copy local `.env` and any non-committed workshop PDFs from backup.