#!/usr/bin/env node
/**
 * Probe PostgREST for expected tables/columns (needs SUPABASE_URL + service key in env).
 * Dry-run: node scripts/verify_supabase_schema.mjs --checklist-only
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const DEFAULT_URL = "https://pqfbcvxisrmtmhmuxbjk.supabase.co";
const DEFAULT_KEY_B64 = "c2Jfc2VjcmV0X3pXVmVzZ0JnNU8zVU80WnVkUi1TQndfTXprQ0VuelI=";

const checks = [
  { name: "reference_code_lists", path: "/rest/v1/reference_code_lists?select=list_key,version&limit=5" },
  { name: "reporting_period_config", path: "/rest/v1/reporting_period_config?select=reporting_period,is_active&limit=5" },
  { name: "verification_log", path: "/rest/v1/verification_log?select=id&limit=1" },
  { name: "ldn_validations governance", path: "/rest/v1/ldn_validations?select=verification_status,data_tier&limit=1" },
  { name: "pressure_layers", path: "/rest/v1/pressure_layers?select=id&limit=1" },
  { name: "national_ldn_units", path: "/rest/v1/national_ldn_units?select=id&limit=1" },
];

function checklistOnly() {
  console.log("Supabase apply order (see backend/APPLY_MIGRATIONS.md):\n");
  for (const f of [
    "001_reference_code_lists.sql",
    "001_reference_code_lists_seed.sql",
    "004_field_governance.sql",
    "005_verification_log.sql",
    "003_pressure_layers.sql",
    "002_national_ldn_units.sql (+ ogr2ogr)",
  ]) {
    console.log(" - backend/migrations/" + f);
  }
  console.log("\nPost-apply SQL: backend/VERIFY_MIGRATIONS.sql");
}

async function probe() {
  const url = process.env.SUPABASE_URL || DEFAULT_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    Buffer.from(DEFAULT_KEY_B64, "base64").toString("utf-8");

  const results = [];
  for (const c of checks) {
    try {
      const res = await fetch(url + c.path, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Accept-Profile": "ldn",
        },
      });
      results.push({
        check: c.name,
        http_status: res.status,
        ok: res.ok,
        hint: res.ok ? "reachable" : (await res.text()).slice(0, 120),
      });
    } catch (e) {
      results.push({ check: c.name, ok: false, error: e.message });
    }
  }
  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("\n" + failed.length + " check(s) failed — apply migrations or fix RLS.");
    process.exitCode = 1;
  }
}

const checklist = process.argv.includes("--checklist-only");
if (checklist) checklistOnly();
else probe();