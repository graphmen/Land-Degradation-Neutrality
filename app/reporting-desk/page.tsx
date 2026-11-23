"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Lock,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

type DryRunPayload = {
  dry_run_at?: string;
  reporting_period?: string;
  section_F?: Record<
    string,
    {
      pass?: boolean;
      status?: string;
      note?: string;
      layer_count?: number;
      row_count?: number;
      manifest_rows?: number;
      package_count?: number;
      degraded_area_percent?: number;
      hash_csv?: string;
      hash_ldn_csv?: string;
      manifest_sha256?: string;
      source_layer_id?: string;
      tier2_total?: number;
      stats?: { ldn_exported?: number; soil_exported?: number };
    }
  >;
  gates?: {
    locked_field_rows?: number;
    steering_blockers?: string[];
    lock_policy?: {
      status?: string;
      mode?: string;
      pass?: boolean | null;
      counts?: { ldn?: number; soil?: number; drylands?: number };
      doc?: string;
    };
  };
};

const EXPORT_JOBS = [
  { id: "EXP-META", label: "Corpus Metadata (CSV)", href: "/api/export/meta?format=csv", gate: "F1" },
  { id: "EXP-SO1-FIELD", label: "SO1 Field Evidence (JSON)", href: "/api/export/so1-field", gate: "F2" },
  { id: "EXP-SO1-STATUS", label: "SO1 Status Summary", href: "/api/export/so1-status", gate: "F6" },
  { id: "EXP-SO1-LC", label: "SO1 Land Cover Matrix", href: "/api/export/so1-lc", gate: "F3 (S10)" },
  { id: "EXP-SO1-LPD", label: "SO1 Productivity (LPD)", href: "/api/export/so1-lpd", gate: "F4 (S11)" },
  { id: "EXP-SO1-SOC", label: "SO1 Soil Organic Carbon", href: "/api/export/so1-soc", gate: "F5 (S12)" },
  { id: "EXP-PHOTOS", label: "Field Photo Manifest", href: "/api/export/photos", gate: "E4" },
  { id: "BUNDLE", label: "Full Reporting Bundle", href: "/api/export/bundle", gate: "F7" },
];

export default function ReportingDeskPage() {
  const [dryRun, setDryRun] = useState<DryRunPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDryRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/config/reporting-dry-run", { cache: "no-store" });
      if (!res.ok) throw new Error(`Reporting dry-run API returned ${res.status}`);
      setDryRun((await res.json()) as DryRunPayload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reporting desk dry-run");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDryRun();
  }, []);

  if (loading && !dryRun) {
    return <div className="gov-card">Loading Reporting Desk §F gates…</div>;
  }

  if (error || !dryRun) {
    return (
      <div className="gov-alert gov-alert-red">
        <AlertTriangle size={18} />
        <div>
          <strong>Reporting Desk dry-run unavailable</strong>
          <div>{error ?? "Run `npm run reporting:dry-run` to generate §F gate output."}</div>
        </div>
      </div>
    );
  }

  const gatesList = Object.entries(dryRun.section_F ?? {});
  const lockPolicy = dryRun.gates?.lock_policy;
  const blockers = dryRun.gates?.steering_blockers ?? [];

  return (
    <>
      <div className="gov-page-header">
        <div>
          <h1 className="gov-page-title">Reporting Desk — UNCCD PRAIS SO1 Rehearsal</h1>
          <p className="gov-page-subtitle">
            Annex E §F export gates, package SHA-256 hashes, verification lock policy, and
            rehearsal bundle downloads for reporting period{" "}
            <strong>{dryRun.reporting_period ?? "2020-2023"}</strong>.
          </p>
        </div>
        <div className="gov-page-actions">
          <button type="button" className="gov-btn" onClick={loadDryRun} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link href="/verification?queue=locked" className="gov-btn gov-btn-primary">
            <Lock size={14} /> View Locked Rows ({dryRun.gates?.locked_field_rows ?? 0})
          </Link>
        </div>
      </div>

      {/* Steering Blockers */}
      {blockers.length > 0 && (
        <div className="gov-alert gov-alert-amber">
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Steering Blockers Before Production PRAIS Submission</strong>
            <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {blockers.map((b, i) => (
                <li key={i} style={{ marginBottom: 3 }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Lock Policy + Dry-run Timestamp */}
      <div className="gov-grid-3">
        <div className="gov-card">
          <div className="gov-metric-label">Locked Field Evidence</div>
          <div className="gov-metric-value">{dryRun.gates?.locked_field_rows ?? 0}</div>
          <div className="gov-metric-sub">
            LDN: <strong>{lockPolicy?.counts?.ldn ?? 0}</strong> · Soil:{" "}
            <strong>{lockPolicy?.counts?.soil ?? 0}</strong> · Drylands:{" "}
            <strong>{lockPolicy?.counts?.drylands ?? 0}</strong>
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-metric-label">Verification Lock Policy</div>
          <div style={{ margin: "8px 0" }}>
            <span className="gov-badge gov-badge-amber">
              {lockPolicy?.mode ?? "pilot_rehearsal"}
            </span>
          </div>
          <div className="gov-metric-sub">
            Status: <strong>{lockPolicy?.status ?? "draft_pending_ema_sign_off"}</strong>
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-metric-label">Last Dry-Run Rehearsal</div>
          <div style={{ fontSize: 15, fontWeight: 700, margin: "8px 0 4px" }}>
            {dryRun.dry_run_at ? new Date(dryRun.dry_run_at).toLocaleString() : "—"}
          </div>
          <div className="gov-metric-sub">
            Period: <strong>{dryRun.reporting_period ?? "2020-2023"}</strong> · Refresh via{" "}
            <span className="gov-mono">npm run reporting:dry-run</span>
          </div>
        </div>
      </div>

      {/* §F Gates Table */}
      <div className="gov-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #d9e2dc" }}>
          <div className="gov-card-title">Annex E §F Export Gates</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="gov-table">
            <thead>
              <tr>
                <th>Gate</th>
                <th>Status</th>
                <th>Coverage / Detail</th>
                <th>SHA-256 Digest</th>
                <th>Notes / Steering Dependency</th>
              </tr>
            </thead>
            <tbody>
              {gatesList.map(([key, g]) => {
                const hash = g.hash_csv ?? g.hash_ldn_csv ?? g.manifest_sha256 ?? null;
                return (
                  <tr key={key}>
                    <td className="gov-mono" style={{ fontWeight: 700 }}>
                      {key}
                    </td>
                    <td>
                      {g.pass ? (
                        <span className="gov-badge gov-badge-green">
                          <CheckCircle2 size={12} /> PASS
                        </span>
                      ) : (
                        <span className="gov-badge gov-badge-red">
                          <AlertTriangle size={12} /> BLOCKED
                        </span>
                      )}
                    </td>
                    <td>
                      {g.layer_count != null && `${g.layer_count} layers`}
                      {g.stats &&
                        `${g.stats.ldn_exported ?? 0} LDN · ${g.stats.soil_exported ?? 0} Soil`}
                      {g.row_count != null && `${g.row_count} template rows`}
                      {g.tier2_total != null && ` · ${g.tier2_total} Tier-2 cores`}
                      {g.degraded_area_percent != null &&
                        `${g.degraded_area_percent.toFixed(2)}% degraded`}
                      {g.manifest_rows != null && `${g.manifest_rows} photo rows`}
                      {g.package_count != null && `${g.package_count} packages`}
                    </td>
                    <td className="gov-mono" title={hash ?? undefined}>
                      {hash ? `${hash.slice(0, 14)}…` : "—"}
                    </td>
                    <td style={{ color: "#4f6457" }}>
                      {g.note ?? (g.status ? g.status.replace(/_/g, " ") : "Ready for rehearsal")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Jobs Rehearsal Panel */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="gov-card-title">Rehearsal Export Jobs (Live API Routes)</div>
          <Link href="/verification?queue=submitted" className="gov-btn gov-btn-sm">
            <ClipboardCheck size={13} /> Lock More Records
          </Link>
        </div>

        <div className="gov-grid-4">
          {EXPORT_JOBS.map((job) => (
            <a
              key={job.id}
              href={job.href}
              target="_blank"
              rel="noreferrer"
              className="gov-card"
              style={{
                textDecoration: "none",
                padding: 13,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="gov-mono" style={{ fontWeight: 700, color: "#005a2b" }}>
                  {job.id}
                </span>
                <Download size={14} color="#4f6457" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#102117" }}>{job.label}</div>
              <div style={{ fontSize: 11, color: "#5b7063" }}>Gate: {job.gate}</div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
