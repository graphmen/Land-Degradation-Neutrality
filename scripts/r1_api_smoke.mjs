#!/usr/bin/env node
/**
 * R1 steering — smoke GETs for demo endpoints (dev or production).
 * Usage: npm run r1:smoke
 *        $env:R1_SMOKE_BASE_URL="https://your-host"; npm run r1:smoke
 */
async function resolveBase() {
  const env = process.env.R1_SMOKE_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  for (const port of [3000, 3001]) {
    const candidate = `http://localhost:${port}`;
    try {
      const res = await fetch(`${candidate}/api/status`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.programme) return candidate;
      }
    } catch {
      /* try next port */
    }
  }
  return "http://localhost:3000";
}

const CHECKS = [
  { path: "/api/status", key: "programme" },
  { path: "/api/national-overview", key: "field_evidence" },
  { path: "/api/qc/summary", key: "field_ldn" },
  { path: "/api/corpus-layers", key: "layers" },
  {
    path: "/api/validator/ceid?ceid=11268_17236&rule=second_segment",
    key: "match",
  },
  { path: "/api/validator/ceid?ceid=ZC2", key: "alias_status" },
  { path: "/api/evidence/summary", key: "by_type" },
  { path: "/api/evidence/registry?prais_eligible=true", key: "records" },
  { path: "/api/verify/queues?queue=locked", key: "queues" },
  { path: "/api/config/s2-preflight", key: "phase_ab_ready" },
  { path: "/api/config/reporting-dry-run", key: "section_F" },
  { path: "/api/config/reporting", key: "active_reporting_period" },
  { path: "/api/config/verification-lock-policy", key: "minimums" },
  { path: "/api/config/ceid-aliases", key: "entries" },
  { path: "/api/export/meta", key: "layers" },
];

async function probe(base, { path, key }) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, status: res.status, detail: "non-JSON response" };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        detail: body.error || body.hint || res.statusText,
      };
    }
    const hasKey =
      key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), body) !==
      undefined;
    if (!hasKey) {
      return { ok: false, status: res.status, detail: `missing key: ${key}` };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const base = await resolveBase();
  console.log(`R1 API smoke — ${base}\n`);
  let failed = 0;
  for (const check of CHECKS) {
    const r = await probe(base, check);
    const mark = r.ok ? "OK" : "FAIL";
    const extra = r.ok ? "" : ` — ${r.detail ?? r.status}`;
    console.log(`  [${mark}] ${check.path}${extra}`);
    if (!r.ok) failed++;
  }
  console.log(`\n${CHECKS.length - failed}/${CHECKS.length} passed`);
  if (failed) {
    console.error("\nStart dev server: npm run dev");
    console.error("Refresh artefacts: npm run qc:refresh");
    process.exit(1);
  }
}

main();