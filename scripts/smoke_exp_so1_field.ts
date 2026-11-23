import { buildExpSo1FieldPackage } from "../lib/exp-so1-field-export";

async function main() {
  const pkg = await buildExpSo1FieldPackage({ eligibility: "all" });
  console.log(JSON.stringify(pkg.stats, null, 2));
  console.log("ldn columns", pkg.ldn[0] ? Object.keys(pkg.ldn[0]).length : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});