import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { buildExpSo1FieldPackage } from "../lib/exp-so1-field-export";
import { buildExpSo1StatusPackage } from "../lib/exp-so1-status-export";

async function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function main() {
  const field = await buildExpSo1FieldPackage({ eligibility: "all" });
  const status = await buildExpSo1StatusPackage();
  const period = status.reporting_period ?? "unassigned";

  const report = {
    dry_run_at: new Date().toISOString(),
    reporting_period: period,
    section_F: {
      F2_EXP_SO1_FIELD: {
        pass: field.ldn.length > 0 && field.soil.length > 0,
        ldn_columns: 23,
        stats: field.stats,
        hash_ldn_csv: await sha256(field.csv.ldn),
        hash_soil_csv: await sha256(field.csv.soil),
      },
      F6_EXP_SO1_STATUS: {
        pass: status.rows.length >= 3,
        degraded_area_percent: status.summary.degraded_area_percent,
        area_unit_confirmed: status.summary.area_unit != null,
        hash_csv: await sha256(status.csv),
        one_ao_ready: status.metadata.one_ao_ready === true,
      },
    },
    gates: {
      locked_field_rows:
        (await buildExpSo1FieldPackage({ eligibility: "locked" })).stats.ldn_exported,
      steering_blockers: [
        "LDN-NAT-ALL Area unit (Q1)",
        "1OAO national LC+LPD+SOC run pending",
        "Zero locked field rows for production export",
      ],
    },
  };

  const outPath = path.join(
    process.cwd(),
    "public",
    "reporting-desk-dry-run.json"
  );
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});