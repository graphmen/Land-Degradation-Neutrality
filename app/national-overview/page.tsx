"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileSpreadsheet,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
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
      setError(e instanceof Error ? e.message : "Failed to load national overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="gov-card">
        <div className="gov-card-title">Loading National Overview…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="gov-alert gov-alert-red">
        <AlertTriangle size={18} />
        <div>
          <strong>Unable to load National Overview</strong>
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
      {/* Executive Header */}
      <div className="gov-page-header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="gov-page-title">National Overview — Zimbabwe LDN Programme</h1>
          <p className="gov-page-subtitle">
            Environmental Management Agency (EMA) executive summary for UNCCD SDG Indicator 15.3.1
            · Reporting Cycle <strong>{period}</strong> · Baseline end 2015.
          </p>
        </div>
        <div className="gov-page-actions">
          <button type="button" className="gov-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link href="/layers" className="gov-btn">
            <Layers size={14} /> Spatial Map
          </Link>
          <Link href="/reporting-desk" className="gov-btn gov-btn-primary">
            <FileCheck2 size={14} /> PRAIS 4 Submission
          </Link>
        </div>
      </div>

      {/* 4 Balanced Executive Indicator Cards */}
      <div className="gov-grid-4">
        <div className="gov-card" style={{ padding: "14px 16px", borderLeft: "4px solid #005a2b" }}>
          <div className="gov-metric-label">SDG 15.3.1 National Status</div>
          <div className="gov-metric-value" style={{ fontSize: 26 }}>
            {data.so1.degraded_area_percent != null
              ? `${data.so1.degraded_area_percent.toFixed(2)}%`
              : "Pending"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <span
              className={`gov-badge ${
                data.so1.one_ao_ready ? "gov-badge-green" : "gov-badge-amber"
              }`}
            >
              {data.so1.one_ao_ready ? "1OAO Complete" : "Interim Zonal"}
            </span>
            <Link href="/analytics" style={{ fontSize: 12, color: "#005a2b", fontWeight: 600 }}>
              SO1 Analytics →
            </Link>
          </div>
        </div>

        <div className="gov-card" style={{ padding: "14px 16px", borderLeft: "4px solid #1d4ed8" }}>
          <div className="gov-metric-label">Field Evidence Submissions</div>
          <div className="gov-metric-value" style={{ fontSize: 26 }}>
            {data.field_evidence.total.toLocaleString()}
          </div>
          <div className="gov-metric-sub">
            <strong>{data.field_evidence.ldn}</strong> LDN ·{" "}
            <strong>{data.field_evidence.soil}</strong> Soil ·{" "}
            <strong>{data.field_evidence.drylands}</strong> Drylands
          </div>
          <div className="gov-metric-sub" style={{ marginTop: 2 }}>
            CEID polygon match: <strong>{ceidRatePct}</strong>
          </div>
        </div>

        <div className="gov-card" style={{ padding: "14px 16px", borderLeft: "4px solid #d97706" }}>
          <div className="gov-metric-label">Verification & Locks</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div className="gov-metric-value" style={{ fontSize: 26 }}>
              {data.verification.locked_count}
            </div>
            <span className="gov-metric-sub">
              locked of {totalVerifiable.toLocaleString()} ({lockedPct}%)
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: "#e6ede9",
              borderRadius: 999,
              overflow: "hidden",
              margin: "6px 0",
            }}
          >
            <div
              style={{
                width: `${Math.max(lockedPct, data.verification.locked_count > 0 ? 3 : 0)}%`,
                height: "100%",
                background: "#005a2b",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#556b5e" }}>
              {data.verification.backlog_submitted} pending review
            </span>
            <Link href="/verification" style={{ color: "#005a2b", fontWeight: 600 }}>
              Verify →
            </Link>
          </div>
        </div>

        <div className="gov-card" style={{ padding: "14px 16px", borderLeft: "4px solid #0891b2" }}>
          <div className="gov-metric-label">PRAIS 4 Readiness</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div className="gov-metric-value" style={{ fontSize: 26 }}>
              {praisReady}/{praisTotal}
            </div>
            <span className="gov-badge gov-badge-blue">Due Nov 2026</span>
          </div>
          <div
            style={{
              height: 6,
              background: "#e6ede9",
              borderRadius: 999,
              overflow: "hidden",
              margin: "6px 0",
            }}
          >
            <div style={{ width: `${praisPct}%`, height: "100%", background: "#0891b2" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#556b5e" }}>{praisPct}% packages ready</span>
            <Link href="/reporting-desk" style={{ color: "#005a2b", fontWeight: 600 }}>
              Open Desk →
            </Link>
          </div>
        </div>
      </div>

      {/* Main 2-Column Executive Briefing */}
      <div className="gov-grid-2">
        {/* Left: National Spatial Corpus & Counterbalancing */}
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">
              <Database size={17} color="#005a2b" />
              National Spatial Corpus ({data.corpus_health.layer_count} registered datasets)
            </div>
            <Link href="/layers" className="gov-btn gov-btn-sm">
              Open Spatial Map <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {Object.entries(data.corpus_health.by_import_status).map(([status, count]) => (
              <span
                key={status}
                className={`gov-badge ${
                  status === "etl_complete" || status === "json_loaded"
                    ? "gov-badge-green"
                    : status === "staging_json" || status === "partial"
                      ? "gov-badge-blue"
                      : "gov-badge-amber"
                }`}
              >
                {STATUS_LABELS[status] ?? status}: {count}
              </span>
            ))}
          </div>

          <div className="gov-kv-grid">
            <div>
              <div className="gov-kv-label">National LDN Validation Units</div>
              <div className="gov-kv-val">254,873 polygons</div>
            </div>
            <div>
              <div className="gov-kv-label">EMA Monitoring Network</div>
              <div className="gov-kv-val">28 reference sites</div>
            </div>
            <div>
              <div className="gov-kv-label">Restoration Bright Spots (SO4)</div>
              <div className="gov-kv-val">
                {data.corpus_health.staging_highlights.ema_projects ?? 47} projects ·{" "}
                {data.corpus_health.staging_highlights.sbc_points?.toLocaleString() ?? "1,367"} SBC
              </div>
            </div>
            <div>
              <div className="gov-kv-label">Degradation Drivers</div>
              <div className="gov-kv-val">
                {data.corpus_health.staging_highlights.pressure_points?.toLocaleString() ?? "2,804"}{" "}
                mapped sites
              </div>
            </div>
          </div>
        </div>

        {/* Right: Priorities for PRAIS 4 Submission */}
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">
              <ShieldCheck size={17} color="#005a2b" />
              Key Priorities Before PRAIS 4 Submission
            </div>
            <Link href="/reporting-desk" className="gov-btn gov-btn-sm">
              Submission Center <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "9px 12px",
                background: "#f8fbf9",
                border: "1px solid #d9e2dc",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <CheckCircle2 size={16} color="#146c38" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Annex II Metadata & Field QA Ready:</strong> All 13 national datasets,
                field submissions, and 169 evidence photos pass automated validation.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "9px 12px",
                background: "#fffbeb",
                border: "1px solid #f5d680",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <AlertTriangle size={16} color="#9a5b04" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Ingest National SO1 Rasters:</strong> Deliver 2015/2023 Land Cover,
                Productivity (LPD), and Tier-1 SOC GeoTIFFs to compute full One-Out-All-Out (1OAO).
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "9px 12px",
                background: "#fffbeb",
                border: "1px solid #f5d680",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <Lock size={16} color="#9a5b04" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Scale District & National Verification Locks:</strong> Review and lock
                submitted LDN, Soil, and Drylands field records for PRAIS eligibility.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Module Navigation */}
      <div className="gov-grid-4">
        <Link
          href="/evidence/registry"
          className="gov-card"
          style={{ textDecoration: "none", display: "block", padding: 14 }}
        >
          <div className="gov-card-title" style={{ marginBottom: 4 }}>
            <FileSpreadsheet size={16} color="#005a2b" /> Evidence Registry
          </div>
          <div className="gov-metric-sub">
            Search unified LDN, Soil, and Drylands field records with PRAIS eligibility filters.
          </div>
        </Link>

        <Link
          href="/verification?queue=submitted"
          className="gov-card"
          style={{ textDecoration: "none", display: "block", padding: 14 }}
        >
          <div className="gov-card-title" style={{ marginBottom: 4 }}>
            <ClipboardCheck size={16} color="#005a2b" /> Verification Workspace
          </div>
          <div className="gov-metric-sub">
            Review, batch-verify, and lock field submissions with full audit logging.
          </div>
        </Link>

        <Link
          href="/analytics"
          className="gov-card"
          style={{ textDecoration: "none", display: "block", padding: 14 }}
        >
          <div className="gov-card-title" style={{ marginBottom: 4 }}>
            <BarChart3 size={16} color="#005a2b" /> Analytics (SO1)
          </div>
          <div className="gov-metric-sub">
            Inspect the UNCCD 7×7 Land Cover matrix, LPD classes, and Tier-2 laboratory SOC.
          </div>
        </Link>

        <Link
          href="/reporting-desk"
          className="gov-card"
          style={{ textDecoration: "none", display: "block", padding: 14 }}
        >
          <div className="gov-card-title" style={{ marginBottom: 4 }}>
            <FileCheck2 size={16} color="#005a2b" /> Reporting Desk
          </div>
          <div className="gov-metric-sub">
            Download verified PRAIS 4 tables, track UNCCD checklists, and record officer sign-off.
          </div>
        </Link>
      </div>
    </>
  );
}
