"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ListChecks,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useGovPlatform } from "@/components/GovPlatformContext";

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
  { id: "EXP-META", label: "Corpus Metadata (CSV)", href: "/api/export/meta?format=csv", gate: "Annex II" },
  { id: "EXP-SO1-FIELD", label: "SO1 Field Evidence (JSON)", href: "/api/export/so1-field", gate: "Field QA" },
  { id: "EXP-SO1-STATUS", label: "SO1 Status Summary", href: "/api/export/so1-status", gate: "SO1-4" },
  { id: "EXP-SO1-LC", label: "SO1 Land Cover Matrix", href: "/api/export/so1-lc", gate: "SO1-1" },
  { id: "EXP-SO1-LPD", label: "SO1 Productivity (LPD)", href: "/api/export/so1-lpd", gate: "SO1-2" },
  { id: "EXP-SO1-SOC", label: "SO1 Soil Organic Carbon", href: "/api/export/so1-soc", gate: "SO1-3" },
  { id: "EXP-PHOTOS", label: "Field Photo Manifest", href: "/api/export/photos", gate: "Attachments" },
  { id: "BUNDLE", label: "Full Reporting Bundle", href: "/api/export/bundle", gate: "PRAIS 4" },
];

export default function ReportingDeskPage() {
  const { period, role, permissions } = useGovPlatform();
  const [dryRun, setDryRun] = useState<DryRunPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attestationNote, setAttestationNote] = useState("");
  const [attestedAt, setAttestedAt] = useState<string | null>(null);

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
          <strong>Reporting Desk snapshot unavailable</strong>
          <div>{error ?? "Reporting rehearsal snapshot has not been generated yet."}</div>
        </div>
      </div>
    );
  }

  const gatesList = Object.entries(dryRun.section_F ?? {});
  const lockPolicy = dryRun.gates?.lock_policy;
  const blockers = dryRun.gates?.steering_blockers ?? [];
  const f1Pass = dryRun.section_F?.F1_EXP_META?.pass === true;
  const f2Pass = dryRun.section_F?.F2_EXP_SO1_FIELD?.pass === true;
  const f7Hash = dryRun.section_F?.F7_REPORTING_BUNDLE?.manifest_sha256 ?? "—";

  const gpgSections = [
    {
      code: "A",
      title: "Governance & Authority",
      status: "partial",
      items: [
        "National Reporting Officer responsibilities established under EMA RACI",
        `Active reporting cycle tagged (${period} · UNCCD baseline end 2015)`,
        "UNCCD Annex F national code lists standardized across web & mobile",
        "National Land Cover raster authority pending final approval",
      ],
    },
    {
      code: "B",
      title: "National Spatial Corpus",
      status: "partial",
      items: [
        "National Land Cover, LPD, and SOC GeoTIFF surfaces scheduled for ingestion",
        "Combined national LDN validation units (254,873 polygons) registered",
        `Locked field validations ready for PRAIS export: ${dryRun.gates?.locked_field_rows ?? 0}`,
        "Soil cores (632), Drylands ILUP (16), Restoration projects (47), SBC (1,367), Pressures (2,804), Monitoring sites (28)",
      ],
    },
    {
      code: "C",
      title: "PRAIS 4 SO1 Table Mapping",
      status: "ready",
      items: [
        "SO1-1 Land Cover → EXP-SO1-LC (7-class UNCCD transition matrix)",
        "SO1-2 Land Productivity → EXP-SO1-LPD (4-class LPD summary)",
        "SO1-3 Soil Organic Carbon → EXP-SO1-SOC (Tier-1 surface + 632 Tier-2 cores)",
        "SO1-4 Proportion Degraded → EXP-SO1-STATUS + Annex II Metadata (EXP-META)",
      ],
    },
    {
      code: "D",
      title: "UNCCD GPG v2 Methodology",
      status: "partial",
      items: [
        "Baseline period end 2015 (t0_end_2015) tagged across all exports",
        "One-Out-All-Out (1OAO) integration active once national rasters are ingested",
        "7-class UNCCD land cover legend & 49-cell transition rules verified",
        "Data Tier (Tier 1/2/3) & Confidence levels recorded on all 13 corpus layers",
      ],
    },
    {
      code: "E",
      title: "Internal Verification Gate",
      status: f2Pass ? "ready" : "partial",
      items: [
        "PRAIS export strictly enforces immutable locked verification status",
        "Complete verification audit trail maintained per record transition",
        "Standardized code list version recorded on mobile & web submissions",
        "Field photo evidence manifest (147 records) linked to submissions",
      ],
    },
    {
      code: "F & G",
      title: "Export Rehearsal & PRAIS Submission",
      status: f1Pass && f2Pass ? "partial" : "blocked",
      items: [
        `Metadata, Field QA, and Bundle rehearsal packages verified (SHA-256: ${f7Hash.slice(0, 14)}…)`,
        "SO1-1, SO1-2, and SO1-3 raster export tables awaiting national GeoTIFF ingestion",
        "Target UNCCD PRAIS 4 national submission: November 2026",
      ],
    },
  ];

  return (
    <>
      {!permissions.canAccessReportingDesk && (
        <div className="gov-alert gov-alert-amber">
          <Lock size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Access Notice:</strong> Reporting Desk export attestation is reserved for the{" "}
            <strong>National Reporting Officer</strong>.
          </span>
        </div>
      )}
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

      {/* Compact Lock Policy + Dry-run Status Ribbon */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px 18px",
          padding: "9px 14px",
          background: "#ffffff",
          border: "1px solid #d9e2dc",
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px" }}>
          <span>
            <strong>Locked Evidence:</strong>{" "}
            <strong style={{ color: "#005a2b" }}>{dryRun.gates?.locked_field_rows ?? 0}</strong>{" "}
            (LDN {lockPolicy?.counts?.ldn ?? 0} · Soil {lockPolicy?.counts?.soil ?? 0} · Drylands{" "}
            {lockPolicy?.counts?.drylands ?? 0})
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong>Lock Policy:</strong>{" "}
            <span className="gov-badge gov-badge-amber" style={{ padding: "1px 7px" }}>
              {lockPolicy?.mode === "pilot_rehearsal" ? "Rehearsal Mode" : lockPolicy?.mode ?? "Standard"}
            </span>
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong>Last Dry-Run:</strong>{" "}
            {dryRun.dry_run_at ? new Date(dryRun.dry_run_at).toLocaleString() : "—"}
          </span>
        </div>
        <span className="gov-mono" style={{ fontSize: 11, color: "#556b5e" }}>
          Period: {dryRun.reporting_period ?? "2020-2023"}
        </span>
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

      {/* UNCCD GPG v2 & PRAIS 4 Checklist (Sections A–G) */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="gov-card-title">
            <ListChecks size={17} /> UNCCD GPG v2 / PRAIS 4 Compliance Checklist (Sections A–G)
          </div>
          <span className="gov-badge gov-badge-blue">Baseline: end 2015 · Cycle: {period}</span>
        </div>

        <div className="gov-grid-2">
          {gpgSections.map((sec) => (
            <div key={sec.code} className="gov-card" style={{ background: "#f9fbfa", padding: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <strong style={{ fontSize: 13 }}>
                  Section {sec.code} — {sec.title}
                </strong>
                <span
                  className={`gov-badge ${
                    sec.status === "ready"
                      ? "gov-badge-green"
                      : sec.status === "partial"
                        ? "gov-badge-amber"
                        : "gov-badge-red"
                  }`}
                >
                  {sec.status === "ready" ? "READY" : "IN PROGRESS"}
                </span>
              </div>
              <ul style={{ margin: "0 0 0 16px", padding: 0, fontSize: 12, color: "#3d5246", lineHeight: 1.55 }}>
                {sec.items.map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Officer Rehearsal Handoff Attestation */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="gov-card-title">
            <ShieldCheck size={17} /> PRAIS Rehearsal Handoff Attestation
          </div>
          <span className="gov-mono" style={{ color: "#556b5e" }}>
            Bundle SHA-256: {f7Hash.slice(0, 18)}…
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            className="gov-input"
            style={{ flex: "1 1 280px" }}
            placeholder="Attestation note (e.g. Verified F1/F2 rehearsal hashes for EMA steering)…"
            value={attestationNote}
            onChange={(e) => setAttestationNote(e.target.value)}
            disabled={!permissions.canApproveOrLock}
          />
          <button
            type="button"
            className="gov-btn gov-btn-primary"
            disabled={!permissions.canApproveOrLock || !attestationNote.trim()}
            onClick={() => setAttestedAt(new Date().toISOString())}
          >
            Record Rehearsal Attestation
          </button>
        </div>

        {attestedAt && (
          <div className="gov-alert gov-alert-green" style={{ marginTop: 10 }}>
            <CheckCircle2 size={15} />
            <span>
              Rehearsal attested by <strong>{role}</strong> at{" "}
              {new Date(attestedAt).toLocaleString()} for period <strong>{period}</strong> — “
              {attestationNote}”
            </span>
          </div>
        )}
      </div>
    </>
  );
}
