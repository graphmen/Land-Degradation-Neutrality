/**
 * Step 1.4 — Denormalize LDN top-level columns in public/ldn-data.json
 * Usage: node scripts/flatten_ldn_cache.js
 */
const fs = require("fs");
const path = require("path");
const { flattenLdnRecord, extractLdnFields } = require("./ldn-record-mapper");

const ldnPath = path.join(process.cwd(), "public", "ldn-data.json");

function main() {
  if (!fs.existsSync(ldnPath)) {
    console.error("Missing", ldnPath);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(ldnPath, "utf-8"));
  const records = data.records || [];
  const flat = records.map(flattenLdnRecord);
  const withCover = flat.filter((r) => r.land_cover).length;
  const withUse = flat.filter((r) => r.land_use).length;
  const out = { count: flat.length, records: flat };
  fs.writeFileSync(ldnPath, JSON.stringify(out), "utf-8");
  console.log(
    `OK: flattened ${flat.length} LDN records — land_cover: ${withCover}, land_use: ${withUse}`
  );
  if (withCover < flat.length) {
  console.warn(
      "WARN:",
      flat.length - withCover,
      "records still missing land_cover"
    );
  }
}

main();