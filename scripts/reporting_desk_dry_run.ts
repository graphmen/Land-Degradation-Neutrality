import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { buildExpMetaPackage } from "../lib/exp-meta-export";
import { buildExpSo1FieldPackage } from "../lib/exp-so1-field-export";
import { buildExpSo1LcTemplate } from "../lib/exp-so1-lc-export";
import { buildExpSo1LpdTemplate } from "../lib/exp-so1-lpd-export";
import { buildExpSo1SocPackage } from "../lib/exp-so1-soc-export";
import { buildAndWriteReportingBundle } from "../lib/exp-reporting-bundle";
import { buildExpPhotosPackage } from "../lib/exp-photos-export";
import { buildExpSo1StatusPackage } from "../lib/exp-so1-status-export";

async function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function main() {
  const meta = await buildExpMetaPackage();
  const field = await buildExpSo1FieldPackage({ eligibility: "all" });
  const status = await buildExpSo1StatusPackage();
  const lc = buildExpSo1LcTemplate();
  const lpd = buildExpSo1LpdTemplate();
  const soc = await buildExpSo1SocPackage();
  const photos = await buildExpPhotosPackage();
  const period = status.reporting_period ?? "unassigned";
  const bundle = await buildAndWriteReportingBundle({ rehearsal: true });
  const manifestRaw = await fs.readFile(bundle.manifest_path, "utf-8");
  const manifestHash = await sha256(manifestRaw);
  const lockedField = await buildExpSo1FieldPackage({ eligibility: "locked" });
  const lockedCount = lockedField.stats.ldn_exported;
  const lcLayer = meta.layers.find((l) => l.layer_id === "LC-NAT-STACK");
  const km2Populated = lc.rows.filter((r) => r.area_km2 != null).length;
  const s10Required: string[] = [];
  if (!lcLayer) s10Required.push("LC-NAT-STACK missing from EXP-META");
  if (lcLayer?.import_status === "awaiting_delivery") {
    s10Required.push("S10c: deliver t0/t1 GeoTIFF to important files/");
  }
  s10Required.push("S10a: steering sign T1 (Trends.Earth vs EMA)");
  if (km2Populated < lc.rows.length) {
    s10Required.push(
      `S10e: populate area_km2 (${km2Populated}/${lc.rows.length} cells)`
    );
  }
  const f3Pass =
    lc.status !== "template_only" && km2Populated === lc.rows.length;
  const lpdLayer = meta.layers.find((l) => l.layer_id === "LPD-NAT-RASTER");
  const lpdKm2Populated = lpd.rows.filter((r) => r.area_km2 != null).length;
  const s11Required: string[] = [];
  if (!lpdLayer) s11Required.push("LPD-NAT-RASTER missing from EXP-META");
  if (lpdLayer?.import_status === "awaiting_delivery") {
    s11Required.push("S11: deliver LPD raster to important files/");
  }
  s11Required.push("S11: steering sign LPD source (Trends.Earth vs EMA VI)");
  if (lpdKm2Populated < lpd.rows.length) {
    s11Required.push(
      `S11: populate area_km2 (${lpdKm2Populated}/${lpd.rows.length} classes)`
    );
  }
  const f4Pass =
    lpd.status !== "template_only" && lpdKm2Populated === lpd.rows.length;
  const socLayer = meta.layers.find((l) => l.layer_id === "SOC-NAT-SURFACE");
  const tier1Stock = soc.tier1_national.stock_tonnes;
  const tier1Area = soc.tier1_national.area_km2;
  const tier1Populated =
    tier1Stock != null || tier1Area != null;
  const s12Required: string[] = [];
  if (!socLayer) s12Required.push("SOC-NAT-SURFACE missing from EXP-META");
  if (socLayer?.import_status === "awaiting_delivery") {
    s12Required.push("S12: deliver national SOC surface to important files/");
  }
  s12Required.push("S12: steering sign Tier-1 SOC source (Trends.Earth vs EMA)");
  if (!tier1Populated) {
    s12Required.push("S12: populate tier1_national stock or area metric");
  }
  const f5Tier2Pass = soc.stats.tier2_depth_0_30 > 0;
  const f5FullPass = f5Tier2Pass && tier1Populated;
  const steering_blockers = [
    "LDN-NAT-ALL Area unit (Q1)",
    "1OAO national LC+LPD+SOC run pending",
  ];
  if (lockedCount === 0) {
    steering_blockers.push("Zero locked field rows for production export");
  } else {
    steering_blockers.push(
      `Pilot only: ${lockedCount} locked row(s) — scale lock after R1 + real verifier accounts`
    );
  }

  const report = {
    dry_run_at: new Date().toISOString(),
    reporting_period: period,
    section_F: {
      F1_EXP_META: {
        pass: meta.validation.f1_pass,
        layer_count: meta.layers.length,
        hash_csv: await sha256(meta.csv),
        missing: meta.validation.f1_missing,
      },
      F3_EXP_SO1_LC: {
        pass: f3Pass,
        status: lc.status,
        row_count: lc.rows.length,
        source_layer_id: "LC-NAT-STACK",
        km2_cells_populated: km2Populated,
        note: f3Pass
          ? "National matrix populated"
          : "Template until S10 + zonal stats",
        hash_csv: await sha256(lc.csv),
      },
      F4_EXP_SO1_LPD: {
        pass: f4Pass,
        status: lpd.status,
        row_count: lpd.rows.length,
        source_layer_id: "LPD-NAT-RASTER",
        km2_classes_populated: lpdKm2Populated,
        note: f4Pass
          ? "National LPD zonal summary populated"
          : "Template until S11 + LPD raster",
        hash_csv: await sha256(lpd.csv),
      },
      F5_EXP_SO1_SOC: {
        pass: f5FullPass,
        tier2_pass: f5Tier2Pass,
        status: soc.status,
        tier1_source_layer_id: soc.tier1_national.source_layer_id,
        tier1_national_populated: tier1Populated,
        tier2_total: soc.stats.tier2_total,
        tier2_depth_0_30: soc.stats.tier2_depth_0_30,
        tier2_with_soc_value: soc.stats.tier2_with_soc_value,
        depth_0_30_complete: soc.metadata.depth_0_30_documented,
        note: f5FullPass
          ? "Tier-1 + Tier-2 ready"
          : "Tier-2 partial; Tier-1 awaits S12",
        hash_csv: await sha256(soc.csv.tier2),
      },
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
      E4_EXP_PHOTOS: {
        pass: photos.stats.manifest_rows > 0,
        manifest_rows: photos.stats.manifest_rows,
        ldn_with_photos: photos.stats.rows_with_attachment,
        hash_csv: await sha256(photos.csv),
      },
      F7_REPORTING_BUNDLE: {
        pass: true,
        bundle_id: bundle.bundle_id,
        root_dir: bundle.root_dir,
        manifest_sha256: manifestHash,
        package_count: Object.keys(bundle.packages).length,
      },
    },
    gates: {
      locked_field_rows: lockedCount,
      steering_blockers,
      s10_f3: {
        corpus_registered: lcLayer != null,
        import_status: lcLayer?.import_status ?? "missing",
        template_rows: lc.rows.length,
        km2_cells_populated: km2Populated,
        pass: f3Pass,
        required_for_pass: s10Required,
        design: "LDN Database Princeples/design/REPORTING_DESK_F3_S10_GATE.md",
      },
      s11_f4: {
        corpus_registered: lpdLayer != null,
        import_status: lpdLayer?.import_status ?? "missing",
        template_classes: lpd.rows.length,
        km2_classes_populated: lpdKm2Populated,
        pass: f4Pass,
        required_for_pass: s11Required,
        import_plan:
          "LDN Database Princeples/corpus/metadata/LPD-NAT-RASTER_IMPORT_PLAN.md",
      },
      s12_f5: {
        corpus_registered: socLayer != null,
        import_status: socLayer?.import_status ?? "missing",
        tier1_national_populated: tier1Populated,
        tier2_depth_0_30: soc.stats.tier2_depth_0_30,
        pass: f5FullPass,
        required_for_pass: s12Required,
        import_plan:
          "LDN Database Princeples/corpus/metadata/SOC-NAT-SURFACE_IMPORT_PLAN.md",
      },
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