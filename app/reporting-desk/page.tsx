"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  ListChecks,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useGovPlatform } from "@/components/GovPlatformContext";

type GateRow = {
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
  tier2_total?: number;
  tier2_depth_0_30?: number;
  tier2_with_soc_value?: number;
  stats?: { ldn_exported?: number; soil_exported?: number };
};

type DryRunPayload = {
  dry_run_at?: string;
  reporting_period?: string;
  section_F?: Record<string, GateRow>;
  gates?: {
    locked_field_rows?: number;
    lock_policy?: {
      status?: string;
      mode?: string;
      counts?: { ldn?: number; soil?: number; drylands?: number };
    };
  };
};

type PackageMeta = {
  key: string;
  title: string;
  praisTable: string;
  downloadHref: string;
  downloadLabel: string;
  pendingReason: string;
};

const PRAIS_PACKAGES: PackageMeta[] = [
  {
    key: "F1_EXP_META",
    title: "National Corpus Metadata",
    praisTable: "PRAIS Annex II",
    downloadHref: "/api/export/meta?format=csv",
    downloadLabel: "CSV",
    pendingReason: "Complete dataset custodian and vintage fields.",
  },
  {
    key: "F2_EXP_SO1_FIELD",
    title: "Verified Field Evidence",
    praisTable: "SO1 Field QA",
    downloadHref: "/api/export/so1-field",
    downloadLabel: "JSON",
    pendingReason: "Lock verified field assessments in Verification Workspace.",
  },
  {
    key: "F3_EXP_SO1_LC",
    title: "Land Cover Transitions (7×7)",
    praisTable: "SO1-1",
    downloadHref: "/api/export/so1-lc?format=csv",
    downloadLabel: "Template CSV",
    pendingReason: "Awaiting national 2015 & 2023 Land Cover GeoTIFFs.",
  },
  {
    key: "F4_EXP_SO1_LPD",
    title: "Land Productivity Dynamics",
    praisTable: "SO1-2",
    downloadHref: "/api/export/so1-lpd?format=csv",
    downloadLabel: "Template CSV",
    pendingReason: "Awaiting national Land Productivity (LPD) GeoTIFF.",
  },
  {
    key: "F5_EXP_SO1_SOC",
    title: "Soil Organic Carbon (0–30 cm)",
    praisTable: "SO1-3",
    downloadHref: "/api/export/so1-soc?format=csv_tier2",
    downloadLabel: "Tier-2 CSV",
    pendingReason: "Tier-2 soil cores ready; awaiting national Tier-1 SOC surface.",
  },
  {
    key: "F6_EXP_SO1_STATUS",
    title: "Proportion of Land Degraded",
    praisTable: "SO1-4 (SDG 15.3.1)",
    downloadHref: "/api/export/so1-status",
    downloadLabel: "JSON",
    pendingReason: "Interim polygon zonal estimate; full 1OAO awaits national rasters.",
  },
  {
    key: "E4_EXP_PHOTOS",
    title: "Field Evidence Photo Manifest",
    praisTable: "Supporting Media",
    downloadHref: "/api/export/photos?format=csv",
    downloadLabel: "CSV",
    pendingReason: "Link field photos to verified submissions.",
  },
  {
    key: "F7_REPORTING_BUNDLE",
    title: "Complete PRAIS 4 Submission Bundle",
    praisTable: "Full Package",
    downloadHref: "/api/export/bundle",
    downloadLabel: "Bundle JSON",
    pendingReason: "Assembles all 7 packages with integrity manifest.",
  },
];

type DeskTab = "packages" | "checklist" | "signoff";

export default function ReportingDeskPage() {
  const { period, role, permissions } = useGovPlatform();
  const [tab, setTab] = useState<DeskTab>("packages");
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
      if (!res.ok) throw new Error(`Reporting status API returned ${res.status}`);
      setDryRun((await res.json()) as DryRunPayload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reporting status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDryRun();
  }, []);

  if (loading && !dryRun) {
    return <div className="gov-card">Loading UNCCD PRAIS 4 Reporting Desk…</div>;
  }

  if (error || !dryRun) {
    return (
      <div className="gov-alert gov-alert-red">
        <AlertTriangle size={18} />
        <div>
          <strong>Reporting Desk snapshot unavailable</strong>
          <div>{error ?? "Reporting package snapshot has not been generated yet."}</div>
        </div>
      </div>
    );
  }

  const sectionF = dryRun.section_F ?? {};
  const lockPolicy = dryRun.gates?.lock_policy;
  const readyCount = PRAIS_PACKAGES.filter((p) => sectionF[p.key]?.pass === true).length;
  const totalCount = PRAIS_PACKAGES.length;
  const readyPct = Math.round((readyCount / totalCount) * 100);
  const f7Hash = sectionF.F7_REPORTING_BUNDLE?.manifest_sha256 ?? "—";
  const socGate = sectionF.F5_EXP_SO1_SOC;

  const formatCoverage = (key: string, g?: GateRow): string => {
    if (!g) return "—";
    if (key === "F1_EXP_META") return `${g.layer_count ?? 13} registered national layers`;
    if (key === "F2_EXP_SO1_FIELD") {
      return `${g.stats?.ldn_exported ?? 0} LDN · ${g.stats?.soil_exported ?? 0} Soil records`;
    }
    if (key === "F3_EXP_SO1_LC") return "49-cell 7×7 matrix template";
    if (key === "F4_EXP_SO1_LPD") return "4 productivity classes template";
    if (key === "F5_EXP_SO1_SOC") {
      return `${g.tier2_total ?? 0} soil sites (${g.tier2_depth_0_30 ?? 0} at 0–30 cm · ${
        g.tier2_with_soc_value ?? 0
      } lab SOC %)`;
    }
    if (key === "F6_EXP_SO1_STATUS") {
      return g.degraded_area_percent != null
        ? `${g.degraded_area_percent.toFixed(2)}% degraded (interim zonal)`
        : "Pending calculation";
    }
    if (key === "E4_EXP_PHOTOS") return `${g.manifest_rows ?? 0} linked field photos`;
    if (key === "F7_REPORTING_BUNDLE") return `${g.package_count ?? 7} bundled packages`;
    return "—";
  };

  const gpgSections = [
    {
      code: "A",
      title: "Governance & Authority",
      status: "partial",
      items: [
        "National Reporting Officer responsibilities established under EMA",
        `Active UNCCD reporting cycle tagged (${period} · Baseline end 2015)`,
        "UNCCD Annex F national code lists standardized across web & mobile",
        "National Land Cover raster authority scheduled for sign-off",
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
        `Tier-2 soil sites (${socGate?.tier2_total ?? 175}), Drylands ILUP (16), Projects (47), SBC (1,367), Monitoring sites (28)`,
      ],
    },
    {
      code: "C",
      title: "PRAIS 4 SO1 Table Mapping",
      status: "ready",
      items: [
        "SO1-1 Land Cover → 7-class UNCCD transition matrix",
        "SO1-2 Land Productivity → 4-class LPD zonal summary",
        "SO1-3 Soil Organic Carbon → Tier-1 national surface + Tier-2 field cores",
        "SO1-4 Proportion Degraded → Combined 1OAO + Annex II Metadata",
      ],
    },
    {
      code: "D",
      title: "UNCCD GPG v2 Methodology",
      status: "partial",
      items: [
        "Baseline period end 2015 (t0_end_2015) tagged across all exports",
        "One-Out-All-Out (1OAO) integration ready once national rasters are ingested",
        "7-class UNCCD land cover legend & 49-cell transition rules verified",
        "Data Tier (Tier 1/2/3) & Confidence recorded on all 13 corpus layers",
      ],
    },
    {
      code: "E",
      title: "Internal Verification Gate",
      status: "ready",
      items: [
        "PRAIS export strictly enforces immutable locked verification status",
        "Complete verification audit trail maintained per record transition",
        "Standardized code list version recorded on mobile & web submissions",
        `Field photo evidence manifest (${sectionF.E4_EXP_PHOTOS?.manifest_rows ?? 0} rows) linked`,
      ],
    },
    {
      code: "F & G",
      title: "Export Package & PRAIS Submission",
      status: readyCount === totalCount ? "ready" : "partial",
      items: [
        `${readyCount} of ${totalCount} PRAIS packages verified and downloadable`,
        "SO1-1, SO1-2, and SO1-3 national raster tables awaiting GeoTIFF ingestion",
        "Target UNCCD PRAIS 4 national submission: November 2026",
      ],
    },
  ];

  return (
    <>
      <div className="gov-page-header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="gov-page-title">Reporting Desk — UNCCD PRAIS 4 Submission Center</h1>
          <p className="gov-page-subtitle">
            Track readiness, download verified PRAIS 4 tables, and record National Reporting
            Officer sign-off for cycle <strong>{period}</strong>.
          </p>
        </div>
        <div className="gov-page-actions">
          <button type="button" className="gov-btn" onClick={loadDryRun} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link href="/verification?queue=locked" className="gov-btn gov-btn-primary">
            <Lock size={14} /> Locked Evidence ({dryRun.gates?.locked_field_rows ?? 0})
          </Link>
        </div>
      </div>

      {/* Compact Readiness Progress & Status Strip */}
      <div
        className="gov-card"
        style={{
          padding: "12px 16px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "1 1 320px" }}>
          <div style={{ minWidth: 175 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#556b5e" }}>
              PRAIS 4 Package Readiness
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0b2615" }}>
              {readyCount} of {totalCount} Ready ({readyPct}%)
            </div>
          </div>
          <div
            style={{
              flex: 1,
              height: 10,
              background: "#e6ede9",
              borderRadius: 999,
              overflow: "hidden",
              minWidth: 120,
            }}
          >
            <div
              style={{
                width: `${readyPct}%`,
                height: "100%",
                background: "#005a2b",
                borderRadius: 999,
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px", fontSize: 12 }}>
          <span>
            <strong>Locked:</strong> {dryRun.gates?.locked_field_rows ?? 0} (LDN{" "}
            {lockPolicy?.counts?.ldn ?? 0} · Soil {lockPolicy?.counts?.soil ?? 0})
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong>Updated:</strong>{" "}
            {dryRun.dry_run_at ? new Date(dryRun.dry_run_at).toLocaleDateString() : "—"}
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong>Deadline:</strong> November 2026
          </span>
        </div>
      </div>

      {/* Clean Tab Switcher */}
      <div className="gov-filters">
        <button
          type="button"
          className={`gov-btn ${tab === "packages" ? "gov-btn-primary" : ""}`}
          onClick={() => setTab("packages")}
        >
          <FileCheck2 size={14} /> PRAIS 4 Packages ({readyCount}/{totalCount})
        </button>
        <button
          type="button"
          className={`gov-btn ${tab === "checklist" ? "gov-btn-primary" : ""}`}
          onClick={() => setTab("checklist")}
        >
          <ListChecks size={14} /> UNCCD GPG Checklist (A–G)
        </button>
        <button
          type="button"
          className={`gov-btn ${tab === "signoff" ? "gov-btn-primary" : ""}`}
          onClick={() => setTab("signoff")}
        >
          <ShieldCheck size={14} /> Officer Sign-Off
        </button>
      </div>

      {/* TAB 1: PRAIS 4 SUBMISSION PACKAGES */}
      {tab === "packages" && (
        <div className="gov-table-wrap">
          <table className="gov-table">
            <thead>
              <tr>
                <th>PRAIS 4 Package</th>
                <th>Table</th>
                <th>Readiness</th>
                <th>Current Coverage</th>
                <th>Action / Status Note</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {PRAIS_PACKAGES.map((pkg) => {
                const g = sectionF[pkg.key];
                const isReady = g?.pass === true;
                return (
                  <tr key={pkg.key}>
                    <td style={{ fontWeight: 700 }}>{pkg.title}</td>
                    <td>
                      <span className="gov-badge gov-badge-slate">{pkg.praisTable}</span>
                    </td>
                    <td>
                      {isReady ? (
                        <span className="gov-badge gov-badge-green">
                          <CheckCircle2 size={12} /> Ready
                        </span>
                      ) : (
                        <span className="gov-badge gov-badge-amber">
                          <AlertTriangle size={12} /> Pending Raster
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>{formatCoverage(pkg.key, g)}</td>
                    <td style={{ fontSize: 12, color: "#4f6457" }}>
                      {isReady ? "Verified and ready for PRAIS upload" : pkg.pendingReason}
                    </td>
                    <td>
                      <a
                        href={pkg.downloadHref}
                        target="_blank"
                        rel="noreferrer"
                        className={`gov-btn gov-btn-sm ${isReady ? "gov-btn-primary" : ""}`}
                      >
                        <Download size={12} /> {pkg.downloadLabel}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: UNCCD GPG v2 CHECKLIST (A–G) */}
      {tab === "checklist" && (
        <div className="gov-grid-2">
          {gpgSections.map((sec) => (
            <div key={sec.code} className="gov-card" style={{ padding: 15 }}>
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
                    sec.status === "ready" ? "gov-badge-green" : "gov-badge-amber"
                  }`}
                >
                  {sec.status === "ready" ? "Complete" : "In Progress"}
                </span>
              </div>
              <ul
                style={{
                  margin: "0 0 0 16px",
                  padding: 0,
                  fontSize: 12,
                  color: "#3d5246",
                  lineHeight: 1.6,
                }}
              >
                {sec.items.map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: OFFICER SIGN-OFF & INTEGRITY */}
      {tab === "signoff" && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">
              <ShieldCheck size={17} color="#005a2b" /> National Reporting Officer Attestation
            </div>
            <span className="gov-mono" style={{ color: "#556b5e", fontSize: 11 }}>
              Bundle Integrity: {f7Hash.slice(0, 18)}…
            </span>
          </div>

          {!permissions.canApproveOrLock && (
            <div className="gov-alert gov-alert-amber" style={{ marginBottom: 14 }}>
              <Lock size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Formal submission sign-off is restricted to the{" "}
                <strong>National Reporting Officer</strong> (current role: <strong>{role}</strong>).
              </span>
            </div>
          )}

          <p className="gov-metric-sub" style={{ marginBottom: 12 }}>
            Before uploading Zimbabwe’s SO1 package to the UNCCD PRAIS 4 portal, the National
            Reporting Officer records an attestation confirming verified locked field records and
            package integrity for period <strong>{period}</strong>.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              className="gov-input"
              style={{ flex: "1 1 280px" }}
              placeholder="Enter official sign-off note for the reporting record…"
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
              Record Officer Sign-Off
            </button>
            <Link href="/verification?queue=submitted" className="gov-btn">
              <ClipboardCheck size={14} /> Verify More Records
            </Link>
          </div>

          {attestedAt && (
            <div className="gov-alert gov-alert-green" style={{ marginTop: 12 }}>
              <CheckCircle2 size={15} />
              <span>
                Attested by <strong>{role}</strong> on {new Date(attestedAt).toLocaleString()} for
                reporting cycle <strong>{period}</strong> — “{attestationNote}”
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
