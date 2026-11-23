/**
 * Emit SQL to load public/reference-code-lists.v0.9.json into ldn.reference_code_lists (Step 1.3).
 * Usage: node scripts/generate_code_list_seed_sql.js > backend/migrations/001_reference_code_lists_seed.sql
 */
const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "..", "public", "reference-code-lists.v0.9.json");
const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const version = payload.version;
const status = payload.status || "draft";

console.log("-- Generated seed for ldn.reference_code_lists");
console.log("-- Run after 001_reference_code_lists.sql");
console.log("");
console.log(
  `INSERT INTO ldn.reference_code_lists (list_key, version, status, payload, published_at)\n` +
    `VALUES (\n` +
    `  'national_bundle',\n` +
    `  '${version}',\n` +
    `  '${status}',\n` +
    `  '${JSON.stringify(payload).replace(/'/g, "''")}'::jsonb,\n` +
    `  NULL\n` +
    `)\n` +
    `ON CONFLICT (list_key, version) DO UPDATE SET\n` +
    `  status = EXCLUDED.status,\n` +
    `  payload = EXCLUDED.payload;`
);