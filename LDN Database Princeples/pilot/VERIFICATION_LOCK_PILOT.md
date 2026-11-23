# Verification lock pilot (local)

**Purpose:** Demonstrate Annex E chain before R1 UI. **Not** production PRAIS lock.

## Run

```powershell
npx tsx scripts/pilot_verification_lock.ts --count=3
npx tsx scripts/reporting_desk_dry_run.ts
npx tsx scripts/export_reporting_bundle.ts --official
```

Expect **`locked` LDN export count = 3** in dry-run gates.

## Revert

```powershell
npx tsx scripts/pilot_verification_lock.ts --revert
```

Clears pilot edits in `ldn-modifications.json` and pilot rows in `verification-log.json`.

## Steering

Replace `pilot.*@ema.zw` actors with real accounts when Supabase + R1 workspace live.