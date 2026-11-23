"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  FileCode2,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
} from "lucide-react";

type AdminTab = "s2" | "ceid" | "codes" | "readiness";

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

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("s2");
  const [s2, setS2] = useState<S2Payload | null>(null);
  const [ceid, setCeid] = useState<CeidAliasPayload | null>(null);
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);
  const [codes, setCodes] = useState<CodeListsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const [ceidSearch, setCeidSearch] = useState("");
  const [ceidTestInput, setCeidTestInput] = useState("");
  const [ceidTestResult, setCeidTestResult] = useState<string | null>(null);

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
    setCeidTestResult("Checking…");
    try {
      const res = await fetch(
        `/api/validator/ceid?ceid=${encodeURIComponent(ceidTestInput.trim())}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      setCeidTestResult(JSON.stringify(json, null, 2));
    } catch {
      setCeidTestResult("Validator request failed.");
    }
  };

  return (
    <>
      <div className="gov-page-header">
        <div>
          <h1 className="gov-page-title">Administration — ICT, DBA & GIS Governance</h1>
          <p className="gov-page-subtitle">
            Supabase S2 migration preflight, Q2 CEID alias workbench, Annex F reference code lists,
            and R1/R2 artefact readiness checks.
          </p>
        </div>
        <div className="gov-page-actions">
          <button type="button" className="gov-btn" onClick={loadAll} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="gov-filters">
        {(
          [
            { id: "s2", label: "S2 Migrations (DBA)", icon: Database },
            { id: "ceid", label: `CEID Aliases (${ceid?.entries?.length ?? 0})`, icon: FileCode2 },
            { id: "codes", label: "Code Lists (Annex F)", icon: ListChecks },
            { id: "readiness", label: "Platform Readiness", icon: ShieldCheck },
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

      {/* S2 Migrations */}
      {tab === "s2" && s2 && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">Supabase Migration Preflight (S2)</div>
            <span className={`gov-badge ${s2.phase_ab_ready ? "gov-badge-green" : "gov-badge-amber"}`}>
              Phase A+B: {s2.phase_ab_ready ? "READY TO APPLY" : "CHECK"}
            </span>
          </div>

          <div className="gov-table-wrap" style={{ marginBottom: 18 }}>
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>SQL File</th>
                  <th>Gate</th>
                  <th>Lines / Size</th>
                  <th>SHA-256</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...(s2.phase_ab_files ?? []), ...(s2.phase_cd_deferred ?? [])].map((f) => (
                  <tr key={f.file}>
                    <td>
                      <span className="gov-badge gov-badge-slate">Phase {f.phase}</span>
                    </td>
                    <td className="gov-mono" style={{ fontWeight: 600 }}>
                      {f.file}
                    </td>
                    <td>{f.steering_gate}</td>
                    <td>
                      {f.lines} lines · {f.bytes} B
                    </td>
                    <td className="gov-mono">{f.sha256.slice(0, 14)}…</td>
                    <td>
                      {f.phase === "A" || f.phase === "B" ? (
                        <span className="gov-badge gov-badge-green">Ready (A+B)</span>
                      ) : (
                        <span className="gov-badge gov-badge-amber">Deferred ({f.steering_gate})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CEID Alias Workbench */}
      {tab === "ceid" && ceid && (
        <>
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title">Live CEID Validator Lookup</div>
              <span className="gov-badge gov-badge-blue">
                Default rule: {ceid.default_join_rule ?? "second_segment"}
              </span>
            </div>
            <form onSubmit={testCeidValidator} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                className="gov-input"
                style={{ flex: "1 1 260px" }}
                placeholder="Enter a CEID token to test (e.g. HP1, ZC10, or 12-4501)…"
                value={ceidTestInput}
                onChange={(e) => setCeidTestInput(e.target.value)}
              />
              <button type="submit" className="gov-btn gov-btn-primary">
                Validate CEID
              </button>
            </form>
            {ceidTestResult && (
              <pre
                className="gov-mono"
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "#f4f7f5",
                  borderRadius: 8,
                  border: "1px solid #d9e2dc",
                  overflowX: "auto",
                }}
              >
                {ceidTestResult}
              </pre>
            )}
          </div>

          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title">
                Unmatched CEID Alias Register ({filteredAliases.length} entries · Q2)
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
                  placeholder="Filter aliases…"
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
                    <th>Category</th>
                    <th>Mapped Shapefile ID</th>
                    <th>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAliases.map((e) => (
                    <tr key={e.ceid}>
                      <td className="gov-mono" style={{ fontWeight: 700 }}>
                        {e.ceid}
                      </td>
                      <td>{e.category}</td>
                      <td className="gov-mono">{e.shapefile_id ?? "—"}</td>
                      <td>
                        <span
                          className={`gov-badge ${
                            e.resolution === "pending_ema" ? "gov-badge-amber" : "gov-badge-green"
                          }`}
                        >
                          {e.resolution}
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

      {/* Code Lists */}
      {tab === "codes" && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">Annex F Reference Code Lists</div>
            <span className="gov-badge gov-badge-blue">
              {codes?.version ?? "v0.9-draft"}
            </span>
          </div>

          <div className="gov-grid-2">
            {Object.entries(codes?.lists ?? {}).map(([groupName, items]) => (
              <div key={groupName} className="gov-card" style={{ background: "#f9fbfa", padding: 14 }}>
                <div className="gov-kv-label" style={{ marginBottom: 8 }}>
                  {groupName} ({Array.isArray(items) ? items.length : 0})
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

      {/* Readiness */}
      {tab === "readiness" && readiness && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">Platform & Steering Artefact Readiness</div>
            <span
              className={`gov-badge ${
                readiness.ready_for_facilitation ? "gov-badge-green" : "gov-badge-amber"
              }`}
            >
              {readiness.ready_for_facilitation ? "ALL ARTEFACTS PRESENT" : "ACTION NEEDED"}
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
                }}
              >
                <span className="gov-mono">{key}</span>
                <span className={`gov-badge ${ok ? "gov-badge-green" : "gov-badge-red"}`}>
                  {ok ? <CheckCircle2 size={12} /> : null}
                  {ok ? "OK" : "MISSING"}
                </span>
              </div>
            ))}
          </div>

          {(readiness.commands ?? []).length > 0 && (
            <div>
              <div className="gov-kv-label" style={{ marginBottom: 6 }}>
                <Terminal size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Standard Preflight Commands
              </div>
              <pre
                className="gov-mono"
                style={{
                  padding: 12,
                  background: "#062814",
                  color: "#e6f6ec",
                  borderRadius: 8,
                }}
              >
                {(readiness.commands ?? []).join("\n")}
              </pre>
            </div>
          )}
        </div>
      )}
    </>
  );
}
