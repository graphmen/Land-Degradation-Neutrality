#!/usr/bin/env node
/**
 * CLI wrapper — run after `npm run build` or via tsx on TS sources.
 * Default: eligibility=all dry-run counts; use --locked for production snapshot.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const eligibility = process.argv.includes("--locked")
  ? "locked"
  : process.argv.includes("--rehearsal")
    ? "rehearsal"
    : "all";

const url = `http://localhost:${process.env.PORT || 3000}/api/export/so1-field?eligibility=${eligibility}&write=1`;

console.log(`Requesting ${url} (start next dev if needed)...`);
try {
  const out = execSync(`curl -s "${url}"`, { cwd: root, encoding: "utf-8" });
  const json = JSON.parse(out);
  console.log(JSON.stringify(json.stats, null, 2));
  console.log("metadata:", json.metadata?.output_path ?? json.metadata);
} catch (e) {
  console.error("Export failed — use GET /api/export/so1-field in browser or fix curl.");
  console.error(e.message);
  process.exit(1);
}