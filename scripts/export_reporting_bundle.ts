import { buildAndWriteReportingBundle } from "../lib/exp-reporting-bundle";

async function main() {
  const official = process.argv.includes("--official");
  const bundle = await buildAndWriteReportingBundle({ rehearsal: !official });
  console.log(JSON.stringify(bundle, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});