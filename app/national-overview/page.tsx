"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { NationalOverviewPackage } from "@/lib/national-overview";
import { useGovPlatform } from "@/components/GovPlatformContext";

type DryRunSummary = {
  section_F?: Record<string, { pass?: boolean }>;
};

const STATUS_LABELS: Record<string, string> = {
  etl_complete: "Operational",
  json_loaded: "Loaded",
  staging_json: "Staged",
  partial: "In Progress",
  plan_only: "Scheduled",
  awaiting_delivery: "Pending Raster",
  not_started: "Planned",
};

export default function NationalOverviewPage() {
  const { period } = useGovPlatform();
  const [data, setData] = useState<NationalOverviewPackage | null>(null);
  const [dryRun, setDryRun] = useState<DryRunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, drRes] = await Promise.all([
        fetch("/api/national-overview", { cache: "no-store" }),
        fetch("/api/config/reporting-dry-run", { cache: "no-store" }),
      ]);
      if (!ovRes.ok) {
        throw new Error(`National overview API returned ${ovRes.status}`);
      }
      setData((await ovRes.json()) as NationalOverviewPackage);
      if (drRes.ok) {
        setDryRun((await drRes.json()) as DryRunSummary);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load country profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div style={{ padding: "24px 0", fontSize: 13, color: "#52606d" }}>
        Loading Zimbabwe country profile…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="gov-alert gov-alert-red">
        <AlertTriangle size={16} />
        <div>
          <strong>Unable to load country profile</strong>
          <div>{error ?? "No payload returned."}</div>
        </div>
      </div>
    );
  }

  const ceidRatePct =
    data.field_evidence.ceid_match_rate != null
      ? `${(data.field_evidence.ceid_match_rate * 100).toFixed(1)}%`
      : "—";

  const praisEntries = Object.values(dryRun?.section_F ?? {});
  const praisReady = praisEntries.filter((g) => g.pass === true).length;
  const praisTotal = praisEntries.length || 8;
  const praisPct = Math.round((praisReady / praisTotal) * 100);

  const totalVerifiable =
    data.verification.backlog_submitted + data.verification.locked_count;
  const lockedPct =
    totalVerifiable > 0
      ? Math.round((data.verification.locked_count / totalVerifiable) * 100)
      : 0;

  return (
    <>
      {/* Country Profile Header (UNCCD PRAIS 4 style) */}
      <div className="gov-page-header">
        <div>
          <div className="gov-page-kicker">UNCCD Country Profile · Reporting Cycle {period}</div>
          <h1 className="gov-page-title">Zimbabwe</h1>
          <p className="gov-page-subtitle">
            National Land Degradation Neutrality (SDG Indicator 15.3.1) status and field verification summary.
          </p>
        </div>
        <div className="gov-page-actions">
          <button type="button" className="gov-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link href="/layers" className="gov-btn">
            Spatial Map
          </Link>
          <Link href="/reporting-desk" className="gov-btn gov-btn-primary">
            PRAIS 4 Submission
          </Link>
        </div>
      </div>

      {/* Horizontal Key Indicators Strip (No Rainbow Borders, No SaaS Cards) */}
      <div className="gov-kpi-strip">
        <div className="gov-kpi-cell">
          <span className="gov-metric-label">SDG 15.3.1 Degraded Land</span>
          <span className="gov-metric-value">
            {data.so1.degraded_area_percent != null
              ? `${data.so1.degraded_area_percent.toFixed(2)}%`
              : "Pending"}
          </span>
          <span className="gov-metric-sub">
            {data.so1.one_ao_ready ? "Full 1OAO assessment" : "Interim zonal estimate"} ·{" "}
            <Link href="/analytics" style={{ color: "#005a2b", fontWeight: 600, textDecoration: "none" }}>
              View matrix
            </Link>
          </span>
        </div>

        <div className="gov-kpi-cell">
          <span className="gov-metric-label">Field Evidence Records</span>
          <span className="gov-metric-value">
            {data.field_evidence.total.toLocaleString()}
          </span>
          <span className="gov-metric-sub">
            {data.field_evidence.ldn} LDN, {data.field_evidence.soil} Soil, {data.field_evidence.drylands} Drylands (CEID match {ceidRatePct})
          </span>
        </div>

        <div className="gov-kpi-cell">
          <span className="gov-metric-label">Verified &amp; Locked</span>
          <span className="gov-metric-value">
            {data.verification.locked_count}{" "}
            <span style={{ fontSize: 14, fontWeight: 500, color: "#52606d" }}>
              / {totalVerifiable.toLocaleString()} ({lockedPct}%)
            </span>
          </span>
          <span className="gov-metric-sub">
            {data.verification.backlog_submitted.toLocaleString()} awaiting review ·{" "}
            <Link href="/verification" style={{ color: "#005a2b", fontWeight: 600, textDecoration: "none" }}>
              Open queue
            </Link>
          </span>
        </div>

        <div className="gov-kpi-cell">
          <span className="gov-metric-label">PRAIS 4 Readiness</span>
          <span className="gov-metric-value">
            {praisReady}/{praisTotal}{" "}
            <span style={{ fontSize: 14, fontWeight: 500, color: "#52606d" }}>
              ({praisPct}%)
            </span>
          </span>
          <span className="gov-metric-sub">
            Submission deadline Nov 2026 ·{" "}
            <Link href="/reporting-desk" style={{ color: "#005a2b", fontWeight: 600, textDecoration: "none" }}>
              Reporting desk
            </Link>
          </span>
        </div>
      </div>

      {/* Main 2-Column Editorial Summary */}
      <div className="gov-grid-2">
        {/* Left: National Spatial Corpus Table */}
        <section>
          <div className="gov-card-header" style={{ borderBottom: "2px solid #1a1f24", marginBottom: 0 }}>
            <h2 className="gov-card-title">
              National Spatial Corpus ({data.corpus_health.layer_count} Datasets)
            </h2>
            <Link href="/layers" style={{ fontSize: 12, color: "#005a2b", fontWeight: 600, textDecoration: "none" }}>
              Explore layers →
            </Link>
          </div>

          <table className="gov-table" style={{ border: "1px solid #dcdfe2", borderTop: "none" }}>
            <tbody>
              <tr>
                <td style={{ color: "#52606d", width: "55%" }}>National LDN Validation Units</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>254,873 polygons</td>
              </tr>
              <tr>
                <td style={{ color: "#52606d" }}>EMA Monitoring Network</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>28 reference sites</td>
              </tr>
              <tr>
                <td style={{ color: "#52606d" }}>Restoration Interventions (SO4)</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>
                  {data.corpus_health.staging_highlights.ema_projects ?? 47} projects,{" "}
                  {data.corpus_health.staging_highlights.sbc_points?.toLocaleString() ?? "1,367"} SBC
                </td>
              </tr>
              <tr>
                <td style={{ color: "#52606d" }}>Mapped Degradation Drivers</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>
                  {data.corpus_health.staging_highlights.pressure_points?.toLocaleString() ?? "2,804"} sites
                </td>
              </tr>
              <tr>
                <td style={{ color: "#52606d" }}>Dataset Readiness Breakdown</td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 5 }}>
                    {Object.entries(data.corpus_health.by_import_status).map(([status, count]) => (
                      <span key={status} className="gov-badge gov-badge-slate">
                        {STATUS_LABELS[status] ?? status}: {count}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Right: Reporting Priorities Checklist */}
        <section>
          <div className="gov-card-header" style={{ borderBottom: "2px solid #1a1f24", marginBottom: 0 }}>
            <h2 className="gov-card-title">PRAIS 4 Submission Priorities</h2>
            <Link href="/reporting-desk" style={{ fontSize: 12, color: "#005a2b", fontWeight: 600, textDecoration: "none" }}>
              Open reporting desk →
            </Link>
          </div>

          <table className="gov-table" style={{ border: "1px solid #dcdfe2", borderTop: "none" }}>
            <tbody>
              <tr>
                <td style={{ width: 92 }}>
                  <span className="gov-badge gov-badge-green">Ready</span>
                </td>
                <td>
                  <strong>Annex II Metadata &amp; Field QA</strong>
                  <div style={{ fontSize: 12, color: "#52606d", marginTop: 2 }}>
                    All 13 national datasets, field submissions, and 169 evidence photos pass validation.
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="gov-badge gov-badge-amber">Pending</span>
                </td>
                <td>
                  <strong>National SO1 Raster Ingestion</strong>
                  <div style={{ fontSize: 12, color: "#52606d", marginTop: 2 }}>
                    Ingest 2015/2023 Land Cover, Productivity (LPD), and Tier-1 SOC GeoTIFFs for full 1OAO.
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="gov-badge gov-badge-amber">In Progress</span>
                </td>
                <td>
                  <strong>District &amp; National Verification Locks</strong>
                  <div style={{ fontSize: 12, color: "#52606d", marginTop: 2 }}>
                    Review and lock submitted LDN, Soil, and Drylands records for PRAIS 4 eligibility.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {/* Quiet Bottom Directory Links (FAO style) */}
      <section style={{ borderTop: "1px solid #dcdfe2", paddingTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#52606d", marginBottom: 12 }}>
          Core Reporting Sections
        </div>
        <div className="gov-grid-4">
          <Link href="/evidence/registry" style={{ textDecoration: "none", color: "inherit", borderTop: "2px solid #005a2b", paddingTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#11181c" }}>Evidence Registry</div>
            <div className="gov-metric-sub" style={{ marginTop: 3 }}>
              Search LDN, Soil, Drylands, Pressures, and Restoration field records.
            </div>
          </Link>

          <Link href="/verification?queue=submitted" style={{ textDecoration: "none", color: "inherit", borderTop: "2px solid #005a2b", paddingTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#11181c" }}>Verification Queue</div>
            <div className="gov-metric-sub" style={{ marginTop: 3 }}>
              Review, batch-verify, and lock field submissions with audit trails.
            </div>
          </Link>

          <Link href="/analytics" style={{ textDecoration: "none", color: "inherit", borderTop: "2px solid #005a2b", paddingTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#11181c" }}>SDG 15.3.1 Analytics</div>
            <div className="gov-metric-sub" style={{ marginTop: 3 }}>
              UNCCD 7×7 Land Cover transition matrix, LPD classes, and Tier-2 SOC.
            </div>
          </Link>

          <Link href="/reporting-desk" style={{ textDecoration: "none", color: "inherit", borderTop: "2px solid #005a2b", paddingTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#11181c" }}>PRAIS 4 Reporting</div>
            <div className="gov-metric-sub" style={{ marginTop: 3 }}>
              Export verified PRAIS 4 tables, checklists, and officer sign-off.
            </div>
          </Link>
        </div>
      </section>
    </>
  );
}
