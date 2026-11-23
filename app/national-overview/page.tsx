"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { NationalOverviewPackage } from "@/lib/national-overview";

type R1ReadinessSummary = {
  ready_for_facilitation?: boolean;
};

export default function NationalOverviewPage() {
  const [data, setData] = useState<NationalOverviewPackage | null>(null);
  const [readiness, setReadiness] = useState<R1ReadinessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, r1Res] = await Promise.all([
        fetch("/api/national-overview", { cache: "no-store" }),
        fetch("/api/config/r1-readiness", { cache: "no-store" }),
      ]);
      if (!ovRes.ok) {
        throw new Error(`National overview API returned ${ovRes.status}`);
      }
      const ovJson = (await ovRes.json()) as NationalOverviewPackage;
      setData(ovJson);
      if (r1Res.ok) {
        setReadiness((await r1Res.json()) as R1ReadinessSummary);
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
        <p className="gov-metric-sub" style={{ marginTop: 6 }}>
          Reading governed field evidence, corpus health, and reporting desk gates.
        </p>
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

  return (
    <>
      <div className="gov-page-header">
        <div>
          <h1 className="gov-page-title">National Overview — Zimbabwe LDN Programme</h1>
          <p className="gov-page-subtitle">
            Governed national summary for UNCCD SDG Indicator 15.3.1 reporting. All metrics display
            explicit period, data tier, and PRAIS eligibility status.
          </p>
        </div>
        <div className="gov-page-actions">
          <button type="button" className="gov-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <Link href="/verification?queue=submitted" className="gov-btn">
            <ClipboardCheck size={14} />
            Verification Queue
          </Link>
          <Link href="/reporting-desk" className="gov-btn gov-btn-primary">
            <FileCheck2 size={14} />
            Reporting Desk
          </Link>
        </div>
      </div>

      {/* Top 4 Ministerial Summary Cards (R1 §4) */}
      <div className="gov-grid-4">
        <div className="gov-card">
          <div className="gov-metric-label">SO1 Headline (SDG 15.3.1)</div>
          <div className="gov-metric-value">
            {data.so1.degraded_area_percent != null
              ? `${data.so1.degraded_area_percent.toFixed(2)}%`
              : "Pending"}
          </div>
          <div style={{ marginBottom: 6 }}>
            <span
              className={`gov-badge ${
                data.so1.one_ao_ready ? "gov-badge-green" : "gov-badge-amber"
              }`}
            >
              {data.so1.one_ao_ready ? "1OAO Ready" : "Interim Polygon Zonal"}
            </span>
          </div>
          <div className="gov-metric-sub">{data.so1.note}</div>
        </div>

        <div className="gov-card">
          <div className="gov-metric-label">Reporting Cycle & Deadline</div>
          <div className="gov-metric-value">{data.reporting_period ?? "Unassigned"}</div>
          <div style={{ marginBottom: 6 }}>
            <span className="gov-badge gov-badge-blue">
              PRAIS Due: {data.reporting_deadline ?? "November 2026"}
            </span>
          </div>
          <div className="gov-metric-sub">
            Only <strong>locked</strong> records with an assigned period are PRAIS-eligible.
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-metric-label">Field Evidence (Unified)</div>
          <div className="gov-metric-value">{data.field_evidence.total.toLocaleString()}</div>
          <div className="gov-metric-sub" style={{ marginBottom: 6 }}>
            <strong>{data.field_evidence.ldn}</strong> LDN ·{" "}
            <strong>{data.field_evidence.soil}</strong> Soil ·{" "}
            <strong>{data.field_evidence.drylands}</strong> Drylands
          </div>
          <div className="gov-metric-sub">
            CEID match: <strong>{ceidRatePct}</strong>
            {data.field_evidence.ceid_alias_pending != null && (
              <> ({data.field_evidence.ceid_alias_pending} pending GIS reconciliation)</>
            )}
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-metric-label">Verification Backlog & Locks</div>
          <div className="gov-metric-value">
            {data.verification.backlog_submitted.toLocaleString()}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <span className="gov-badge gov-badge-amber">Pending verification</span>
            <span className="gov-badge gov-badge-green">
              {data.verification.locked_count} Locked
            </span>
          </div>
          <div className="gov-metric-sub">
            {data.verification.pilot_note ?? "Awaiting verifier lock actions"}{" "}
            <Link href="/verification?queue=locked" style={{ color: "#005a2b", fontWeight: 600 }}>
              View locked →
            </Link>
          </div>
        </div>
      </div>

      {/* Corpus Health & Reporting Desk Gate Summary */}
      <div className="gov-grid-2">
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">
              <Database size={17} />
              National Corpus Health ({data.corpus_health.layer_count} registered layers)
            </div>
            <Link href="/layers" className="gov-btn gov-btn-sm">
              Open Layers Hub <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {Object.entries(data.corpus_health.by_import_status).map(([status, count]) => {
              const labelMap: Record<string, string> = {
                etl_complete: "Operational",
                json_loaded: "Loaded",
                staging_json: "Staged",
                partial: "In Progress",
                plan_only: "Scheduled",
                awaiting_delivery: "Pending Raster",
                not_started: "Planned",
              };
              return (
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
                  {labelMap[status] ?? status.replace(/_/g, " ")}: {count}
                </span>
              );
            })}
          </div>

          <div className="gov-kv-grid">
            <div>
              <div className="gov-kv-label">Pressure Points (Staging)</div>
              <div className="gov-kv-val">
                {data.corpus_health.staging_highlights.pressure_points?.toLocaleString() ?? "—"}
              </div>
            </div>
            <div>
              <div className="gov-kv-label">EMA Restoration Projects</div>
              <div className="gov-kv-val">
                {data.corpus_health.staging_highlights.ema_projects?.toLocaleString() ?? "—"}
              </div>
            </div>
            <div>
              <div className="gov-kv-label">SBC Conservation Points</div>
              <div className="gov-kv-val">
                {data.corpus_health.staging_highlights.sbc_points?.toLocaleString() ?? "—"}
              </div>
            </div>
            <div>
              <div className="gov-kv-label">Reporting Readiness</div>
              <div className="gov-kv-val">
                {readiness?.ready_for_facilitation ? (
                  <span className="gov-badge gov-badge-green">Verified Ready</span>
                ) : (
                  <span className="gov-badge gov-badge-slate">In Review</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">
              <ShieldCheck size={17} />
              Reporting Desk & Steering Blockers
            </div>
            <Link href="/reporting-desk" className="gov-btn gov-btn-sm">
              Inspect §F Gates <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <span
              className={`gov-badge ${
                data.reporting_desk.f1_meta_pass ? "gov-badge-green" : "gov-badge-red"
              }`}
            >
              {data.reporting_desk.f1_meta_pass ? (
                <CheckCircle2 size={12} />
              ) : (
                <AlertTriangle size={12} />
              )}
              F1 EXP-META: {data.reporting_desk.f1_meta_pass ? "PASS" : "CHECK"}
            </span>
            <span className="gov-badge gov-badge-slate">
              Lock Policy: {data.reporting_desk.lock_policy_mode === "pilot_rehearsal" ? "Rehearsal Mode" : data.reporting_desk.lock_policy_mode ?? "Standard"}
            </span>
            <span className="gov-badge gov-badge-green">
              Locked LDN: {data.reporting_desk.locked_ldn ?? data.verification.locked_count}
            </span>
          </div>

          {data.reporting_desk.steering_blockers.length > 0 ? (
            <div className="gov-alert gov-alert-amber">
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Active Steering Blockers ({data.reporting_desk.steering_blockers.length})</strong>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                  {data.reporting_desk.steering_blockers.map((b, i) => (
                    <li key={i} style={{ marginBottom: 3 }}>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="gov-alert gov-alert-green">
              <CheckCircle2 size={16} />
              <span>No steering blockers reported in latest dry-run.</span>
            </div>
          )}
        </div>
      </div>

      {/* Platform Module Shortcuts */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="gov-card-title">Governed Platform Modules</div>
          <span className="gov-metric-sub">
            Generated {new Date(data.generated_at).toLocaleString()}
          </span>
        </div>
        <div className="gov-grid-4">
          <Link
            href="/evidence/registry"
            className="gov-card"
            style={{ textDecoration: "none", display: "block", padding: 14 }}
          >
            <div className="gov-card-title" style={{ marginBottom: 4 }}>
              <FileSpreadsheet size={16} color="#005a2b" />
              Evidence Registry
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
              <ClipboardCheck size={16} color="#005a2b" />
              Verification Workspace
            </div>
            <div className="gov-metric-sub">
              Work Annex E state queues (District → National → Approved → Locked) with audit trail.
            </div>
          </Link>

          <Link
            href="/layers"
            className="gov-card"
            style={{ textDecoration: "none", display: "block", padding: 14 }}
          >
            <div className="gov-card-title" style={{ marginBottom: 4 }}>
              <Layers size={16} color="#005a2b" />
              National Layers
            </div>
            <div className="gov-metric-sub">
              Browse all {data.corpus_health.layer_count} national spatial & field layers with lineage.
            </div>
          </Link>

          <Link
            href="/reporting-desk"
            className="gov-card"
            style={{ textDecoration: "none", display: "block", padding: 14 }}
          >
            <div className="gov-card-title" style={{ marginBottom: 4 }}>
              <FileCheck2 size={16} color="#005a2b" />
              Reporting Desk
            </div>
            <div className="gov-metric-sub">
              Inspect §F export gates, package SHA-256 hashes, and PRAIS rehearsal downloads.
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
