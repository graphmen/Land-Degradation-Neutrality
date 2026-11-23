"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileCode2,
  ListChecks,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useGovPlatform } from "@/components/GovPlatformContext";

type AdminTab = "migrations" | "ceid" | "codes" | "readiness";

type S2File = {
  phase: string;
  file: string;
  steering_gate: string;
  exists: boolean;
  bytes: number;
  lines: number;
  sha256: string;
};

type S2Payload = {
  preflight_at?: string;
  phase_ab_ready?: boolean;
  phase_ab_files?: S2File[];
  phase_cd_deferred?: S2File[];
};

type CeidAliasPayload = {
  version?: string;
  status?: string;
  default_join_rule?: string;
  entries?: Array<{
    ceid: string;
    category: string;
    shapefile_id: string | null;
    resolution: string;
    notes: string | null;
  }>;
};

type ReadinessPayload = {
  checked_at?: string;
  ready_for_facilitation?: boolean;
  artefacts?: Record<string, boolean>;
  commands?: string[];
  notes?: string[];
};

type CodeListsPayload = {
  version?: string;
  status?: string;
  lists?: Record<string, Array<{ code?: string; label?: string } | string>>;
};

type CeidValidationResult = {
  valid?: boolean;
  ceid?: string;
  matched_id?: string | number | null;
  rule?: string;
  hint?: string;
  error?: string;
};

const MIGRATION_DESCRIPTIONS: Record<string, string> = {
  "001_reference_code_lists.sql": "UNCCD Annex F controlled vocabulary schema",
  "001_reference_code_lists_seed.sql": "Initial national land cover, erosion & severity code lists",
  "004_field_governance.sql": "Verification status, data tier & reporting period columns",
  "005_verification_log.sql": "Immutable verification audit trail table",
  "003_pressure_layers.sql": "Invasive species & mining pressure spatial tables",
  "002_national_ldn_units.sql": "Combined national LDN validation units (254,873 polygons)",
};

const CATEGORY_LABELS: Record<string, string> = {
  named_or_short_token: "Named / Short Code",
  legacy_zc_ze_token: "Legacy ZC / ZE Code",
  numeric_unmatched: "Unmatched Numeric ID",
  malformed_or_other: "Other Format",
};

const ARTEFACT_LABELS: Record<string, string> = {
  qc_programme_summary: "National QC Programme Summary",
  reporting_desk_dry_run: "PRAIS 4 Reporting Snapshot",
  qc_ceid_join_report: "CEID Polygon Join Report",
  s2_migration_preflight: "Database Migration Preflight",
  reference_ceid_aliases: "CEID Alias Register",
  verification_lock_policy: "Verification Lock Policy",
};

function formatGroupLabel(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\bldn\b/gi, "LDN")
    .replace(/\bunccd\b/gi, "UNCCD")
    .replace(/\bsoc\b/gi, "SOC")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminPage() {
  const { role, permissions } = useGovPlatform();
  const [tab, setTab] = useState<AdminTab>("migrations");
  const [s2, setS2] = useState<S2Payload | null>(null);
  const [ceid, setCeid] = useState<CeidAliasPayload | null>(null);
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);
  const [codes, setCodes] = useState<CodeListsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const [ceidSearch, setCeidSearch] = useState("");
  const [ceidTestInput, setCeidTestInput] = useState("");
  const [ceidTestResult, setCeidTestResult] = useState<CeidValidationResult | null>(null);
  const [ceidTesting, setCeidTesting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s2Res, ceidRes, r1Res, codeRes] = await Promise.all([
        fetch("/api/config/s2-preflight", { cache: "no-store" }),
        fetch("/api/config/ceid-aliases", { cache: "no-store" }),
        fetch("/api/config/r1-readiness", { cache: "no-store" }),
        fetch("/api/reference/code-lists", { cache: "no-store" }),
      ]);
      if (s2Res.ok) setS2((await s2Res.json()) as S2Payload);
      if (ceidRes.ok) setCeid((await ceidRes.json()) as CeidAliasPayload);
      if (r1Res.ok) setReadiness((await r1Res.json()) as ReadinessPayload);
      if (codeRes.ok) setCodes((await codeRes.json()) as CodeListsPayload);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredAliases = useMemo(() => {
    const list = ceid?.entries ?? [];
    const q = ceidSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.ceid.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.resolution.toLowerCase().includes(q)
    );
  }, [ceid, ceidSearch]);

  const testCeidValidator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ceidTestInput.trim()) return;
    setCeidTesting(true);
    setCeidTestResult(null);
    try {
      const res = await fetch(
        `/api/validator/ceid?ceid=${encodeURIComponent(ceidTestInput.trim())}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as CeidValidationResult;
      setCeidTestResult(json);
    } catch {
      setCeidTestResult({ valid: false, error: "Validator service unavailable." });
    } finally {
      setCeidTesting(false);
    }
  };

  const allMigrations = [...(s2?.phase_ab_files ?? []), ...(s2?.phase_cd_deferred ?? [])];

  return (
    <>
      <div className="gov-page-header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="gov-page-title">System Administration & Data Governance</h1>
          <p className="gov-page-subtitle">
            Database schema governance, Collect Earth ID (CEID) reconciliation, UNCCD Annex F
            reference code lists, and national platform health checks.
          </p>
        </div>
        <div className="gov-page-actions">
          <button type="button" className="gov-btn" onClick={loadAll} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {!permissions.canAccessAdmin && (
        <div className="gov-alert gov-alert-amber" style={{ padding: "9px 14px" }}>
          <Lock size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12 }}>
            <strong>Read-Only View ({role}):</strong> Administrative schema changes are restricted
            to the <strong>ICT / DBA</strong> role.
          </span>
        </div>
      )}

      <div className="gov-filters">
        {(
          [
            { id: "migrations", label: `Database Migrations (${allMigrations.length})`, icon: Database },
            { id: "ceid", label: `CEID Reconciliation (${ceid?.entries?.length ?? 0})`, icon: FileCode2 },
            { id: "codes", label: "Code Lists (Annex F)", icon: ListChecks },
            { id: "readiness", label: "System Readiness", icon: ShieldCheck },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`gov-btn ${tab === t.id ? "gov-btn-primary" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DATABASE MIGRATIONS */}
      {tab === "migrations" && s2 && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">PostgreSQL / Supabase Schema Migrations</div>
            <span className={`gov-badge ${s2.phase_ab_ready ? "gov-badge-green" : "gov-badge-amber"}`}>
              Core Schema: {s2.phase_ab_ready ? "Ready to Apply" : "In Review"}
            </span>
          </div>

          <div className="gov-table-wrap">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Migration Script</th>
                  <th>Purpose</th>
                  <th>Size</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allMigrations.map((f) => (
                  <tr key={f.file}>
                    <td>
                      <span className="gov-badge gov-badge-slate">Stage {f.phase}</span>
                    </td>
                    <td className="gov-mono" style={{ fontWeight: 600 }}>
                      {f.file}
                    </td>
                    <td style={{ fontSize: 12, color: "#4f6457" }}>
                      {MIGRATION_DESCRIPTIONS[f.file] ?? "National LDN database schema"}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {f.lines} lines
                    </td>
                    <td>
                      {f.phase === "A" || f.phase === "B" ? (
                        <span className="gov-badge gov-badge-green">
                          <CheckCircle2 size={11} /> Ready to Apply
                        </span>
                      ) : (
                        <span className="gov-badge gov-badge-amber">Scheduled (PostGIS)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CEID RECONCILIATION */}
      {tab === "ceid" && ceid && (
        <>
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title">Collect Earth ID (CEID) Validator</div>
              <span className="gov-badge gov-badge-blue">
                Join Rule: Second-Segment Match
              </span>
            </div>
            <form onSubmit={testCeidValidator} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                className="gov-input"
                style={{ flex: "1 1 260px" }}
                placeholder="Enter a CEID token to check (e.g. HP1, ZC10, or 11619_11614)…"
                value={ceidTestInput}
                onChange={(e) => setCeidTestInput(e.target.value)}
              />
              <button type="submit" className="gov-btn gov-btn-primary" disabled={ceidTesting}>
                {ceidTesting ? "Checking…" : "Validate CEID"}
              </button>
            </form>

            {ceidTestResult && (
              <div
                className={`gov-alert ${
                  ceidTestResult.valid ? "gov-alert-green" : "gov-alert-amber"
                }`}
                style={{ marginTop: 12 }}
              >
                {ceidTestResult.valid ? (
                  <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div style={{ fontSize: 12 }}>
                  <strong>
                    {ceidTestResult.valid
                      ? `Matched National Polygon ID: ${ceidTestResult.matched_id ?? "Verified"}`
                      : "Unmatched CEID Token"}
                  </strong>
                  <div>
                    {ceidTestResult.hint ??
                      ceidTestResult.error ??
                      "Check the alias register below or assign a shapefile ID during GIS reconciliation."}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title">
                Unmatched CEID Reconciliation Register ({filteredAliases.length} entries)
              </div>
              <div style={{ position: "relative", minWidth: 220 }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#5b7063",
                  }}
                />
                <input
                  type="text"
                  className="gov-input"
                  style={{ paddingLeft: 28, width: "100%" }}
                  placeholder="Filter CEID tokens…"
                  value={ceidSearch}
                  onChange={(e) => setCeidSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="gov-table-wrap">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>CEID Token</th>
                    <th>Classification</th>
                    <th>Mapped Polygon ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAliases.map((e) => (
                    <tr key={e.ceid}>
                      <td className="gov-mono" style={{ fontWeight: 700 }}>
                        {e.ceid}
                      </td>
                      <td>{CATEGORY_LABELS[e.category] ?? formatGroupLabel(e.category)}</td>
                      <td className="gov-mono">{e.shapefile_id ?? "—"}</td>
                      <td>
                        <span
                          className={`gov-badge ${
                            e.resolution === "pending_ema" ? "gov-badge-amber" : "gov-badge-green"
                          }`}
                        >
                          {e.resolution === "pending_ema" ? "Pending GIS Mapping" : e.resolution}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 3: CODE LISTS */}
      {tab === "codes" && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">UNCCD Annex F Reference Code Lists</div>
            <span className="gov-badge gov-badge-blue">EMA Standard v1.0</span>
          </div>

          <div className="gov-grid-2">
            {Object.entries(codes?.lists ?? {}).map(([groupName, items]) => (
              <div key={groupName} className="gov-card" style={{ background: "#f9fbfa", padding: 14 }}>
                <div className="gov-kv-label" style={{ marginBottom: 8 }}>
                  {formatGroupLabel(groupName)} ({Array.isArray(items) ? items.length : 0})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Array.isArray(items) &&
                    items.map((it, idx) => {
                      const label =
                        typeof it === "string"
                          ? it
                          : it.label ?? it.code ?? JSON.stringify(it);
                      return (
                        <span key={idx} className="gov-badge gov-badge-slate">
                          {label}
                        </span>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM READINESS */}
      {tab === "readiness" && readiness && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">National System Health & Governance Artefacts</div>
            <span
              className={`gov-badge ${
                readiness.ready_for_facilitation ? "gov-badge-green" : "gov-badge-amber"
              }`}
            >
              {readiness.ready_for_facilitation ? "All Checks Passing" : "Action Needed"}
            </span>
          </div>

          <div className="gov-grid-3" style={{ marginBottom: 16 }}>
            {Object.entries(readiness.artefacts ?? {}).map(([key, ok]) => (
              <div
                key={key}
                className="gov-card"
                style={{
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {ARTEFACT_LABELS[key] ?? formatGroupLabel(key)}
                </span>
                <span className={`gov-badge ${ok ? "gov-badge-green" : "gov-badge-red"}`}>
                  {ok ? <CheckCircle2 size={12} /> : null}
                  {ok ? "Verified" : "Missing"}
                </span>
              </div>
            ))}
          </div>

          {(readiness.commands ?? []).length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#4f6457",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Terminal size={13} /> Technical Operations Reference (ICT)
              </summary>
              <pre
                className="gov-mono"
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: "#062814",
                  color: "#e6f6ec",
                  borderRadius: 8,
                }}
              >
                {(readiness.commands ?? []).join("\n")}
              </pre>
            </details>
          )}
        </div>
      )}
    </>
  );
}
