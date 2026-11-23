"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Lock,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import type { EvidenceRegistryRow } from "@/lib/evidence-registry";
import type { VerificationQueuesPackage } from "@/lib/verification-queues";
import { useGovPlatform } from "@/components/GovPlatformContext";

const GovPointMap = dynamic(() => import("@/components/GovPointMap"), { ssr: false });

type PhotoManifestRow = {
  submission_id?: string | number;
  uuid?: string;
  download_url?: string | null;
  filename?: string | null;
  source?: string;
};

const ALLOWED_NEXT: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["district_review", "rejected"],
  district_review: ["national_review", "rejected"],
  national_review: ["approved", "rejected"],
  approved: ["locked", "rejected"],
  locked: [],
  rejected: ["submitted"],
};

type AuditEntry = {
  id: string;
  created_at: string;
  from_status: string;
  to_status: string;
  actor_id: string;
  actor_role?: string | null;
  note?: string | null;
  reporting_period?: string | null;
};

function VerificationWorkspaceInner() {
  const searchParams = useSearchParams();
  const initialQueue = searchParams.get("queue") ?? "submitted";
  const { period, role, permissions } = useGovPlatform();

  const [activeQueue, setActiveQueue] = useState(initialQueue);
  const [districtFilter, setDistrictFilter] = useState("");
  const [data, setData] = useState<VerificationQueuesPackage | null>(null);
  const [photoRows, setPhotoRows] = useState<PhotoManifestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer + Transition state
  const [selected, setSelected] = useState<EvidenceRegistryRow | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [toStatus, setToStatus] = useState("");
  const [actor, setActor] = useState("ema_verifier");
  const [actorRole, setActorRole] = useState("national_reporting_officer");
  const [reportingPeriod, setReportingPeriod] = useState<string>(period);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txMessage, setTxMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Bulk Verification Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkToStatus, setBulkToStatus] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setActorRole(role);
    setReportingPeriod(period);
  }, [role, period]);

  useEffect(() => {
    fetch("/api/export/photos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.rows && Array.isArray(json.rows)) {
          setPhotoRows(json.rows as PhotoManifestRow[]);
        }
      })
      .catch(() => {});
  }, []);

  const loadQueue = async (queueName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/verify/queues?queue=${encodeURIComponent(queueName)}&limit=100`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Verification queues API returned ${res.status}`);
      setData((await res.json()) as VerificationQueuesPackage);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load verification queues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(activeQueue);
  }, [activeQueue]);

  const getAllowedForRole = (currentStatus: string): string[] => {
    const base = ALLOWED_NEXT[currentStatus] ?? [];
    if (permissions.canApproveOrLock) return base;
    if (permissions.canVerifyDistrict) {
      return base.filter((st) => st === "district_review" || st === "rejected" || st === "submitted");
    }
    return [];
  };

  const openDrawer = async (row: EvidenceRegistryRow) => {
    setSelected(row);
    setTxMessage(null);
    setComment("");
    const nextOptions = getAllowedForRole(row.verification_status);
    setToStatus(nextOptions[0] ?? "");
    setReportingPeriod(row.reporting_period ?? period);

    setAuditLoading(true);
    try {
      const res = await fetch(
        `/api/verify/log?entity=${encodeURIComponent(row.evidence_type)}&record_id=${encodeURIComponent(row.record_id)}&limit=25`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = (await res.json()) as { entries?: AuditEntry[] };
        setAuditLogs(json.entries ?? []);
      } else {
        setAuditLogs([]);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !toStatus) return;
    setSubmitting(true);
    setTxMessage(null);
    try {
      const res = await fetch("/api/verify/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: selected.evidence_type,
          record_id: selected.record_id,
          from_status: selected.verification_status,
          to_status: toStatus,
          actor: actor.trim() || "ema_verifier",
          actor_role: actorRole,
          comment: comment.trim() || undefined,
          reporting_period: toStatus === "locked" ? reportingPeriod : undefined,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `Transition failed (${res.status})`);
      }
      setTxMessage({
        type: "ok",
        text: `Transitioned ${selected.record_id} from ${selected.verification_status} → ${toStatus}.`,
      });
      await loadQueue(activeQueue);
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              verification_status: toStatus,
              reporting_period: toStatus === "locked" ? reportingPeriod : prev.reporting_period,
              prais_eligible: toStatus === "locked",
            }
          : null
      );
    } catch (err: unknown) {
      setTxMessage({
        type: "err",
        text: err instanceof Error ? err.message : "Transition error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const districts = useMemo(() => {
    const set = new Set<string>();
    for (const r of data?.records ?? []) {
      if (r.district) set.add(r.district);
    }
    return Array.from(set).sort();
  }, [data]);

  const rows = useMemo(() => {
    const list = data?.records ?? [];
    if (!districtFilter) return list;
    return list.filter((r) => r.district === districtFilter);
  }, [data, districtFilter]);

  // Clear selection when switching queues
  useEffect(() => {
    setSelectedKeys(new Set());
    setBulkFeedback(null);
    const statusForQueue =
      activeQueue === "district"
        ? "district_review"
        : activeQueue === "national"
          ? "national_review"
          : activeQueue;
    const opts = getAllowedForRole(statusForQueue);
    setBulkToStatus(opts[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQueue, role]);

  const rowKey = (r: EvidenceRegistryRow) => `${r.evidence_type}::${r.record_id}`;

  const toggleRowSelect = (r: EvidenceRegistryRow) => {
    const k = rowKey(r);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === rows.length && rows.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(rows.map(rowKey)));
    }
  };

  const handleBulkTransition = async () => {
    if (selectedKeys.size === 0 || !bulkToStatus) return;
    setBulkSubmitting(true);
    setBulkFeedback(null);
    try {
      const chosen = rows.filter((r) => selectedKeys.has(rowKey(r)));
      const res = await fetch("/api/verify/bulk-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: chosen.map((r) => ({
            entity: r.evidence_type,
            record_id: r.record_id,
            from_status: r.verification_status,
          })),
          to_status: bulkToStatus,
          actor: actor.trim() || "ema_verifier",
          actor_role: role,
          comment: bulkNote.trim() || undefined,
          reporting_period: bulkToStatus === "locked" ? period : undefined,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        processed?: number;
        failed?: number;
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `Batch transition failed (${res.status})`);
      }
      setBulkFeedback({
        type: "ok",
        text: `Batch verified ${json.processed} record(s) → ${bulkToStatus}${
          json.failed ? ` (${json.failed} skipped)` : ""
        }.`,
      });
      setSelectedKeys(new Set());
      setBulkNote("");
      await loadQueue(activeQueue);
    } catch (err: unknown) {
      setBulkFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Batch transition error",
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <>
      <div className="gov-page-header">
        <div>
          <h1 className="gov-page-title">Verification Workspace</h1>
          <p className="gov-page-subtitle">
            Annex E §E.2 state-machine worklists: submitted → district_review → national_review →
            approved → locked (PRAIS eligible). Field values cannot be edited here.
          </p>
        </div>
        <div className="gov-page-actions">
          <button
            type="button"
            className="gov-btn"
            onClick={() => loadQueue(activeQueue)}
            disabled={loading}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <Link href="/evidence/registry" className="gov-btn">
            <FileSpreadsheet size={14} /> Search All Evidence
          </Link>
        </div>
      </div>

      {/* Compact Single-Row Queue Switcher */}
      {data && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px 10px",
            background: "#ffffff",
            border: "1px solid #d9e2dc",
            borderRadius: 10,
          }}
        >
          {data.queues.map((q) => {
            const active = activeQueue === q.queue;
            return (
              <button
                key={q.queue}
                type="button"
                title={`${q.queue} · ${q.actor}`}
                onClick={() => {
                  setActiveQueue(q.queue);
                  setDistrictFilter("");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 12px",
                  borderRadius: 7,
                  border: `1px solid ${active ? "#005a2b" : "#d9e2dc"}`,
                  background: active ? "#005a2b" : "#f8faf9",
                  color: active ? "#ffffff" : "#172b1f",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {q.queue === "locked" && <Lock size={12} />}
                <span>{q.queue}</span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: active ? "rgba(255,255,255,0.2)" : "#e5ece8",
                    color: active ? "#ffffff" : "#0b2615",
                  }}
                >
                  {q.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {data?.note && (
        <div className="gov-alert gov-alert-green">
          <CheckCircle2 size={16} />
          <span>{data.note}</span>
        </div>
      )}

      {error && <div className="gov-alert gov-alert-red">{error}</div>}

      {/* Filter & Worklist Header */}
      <div className="gov-filters" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong style={{ fontSize: 14 }}>
            Queue: <span style={{ textTransform: "capitalize" }}>{activeQueue}</span>
          </strong>
          <span className="gov-badge gov-badge-slate">{rows.length} shown</span>
        </div>

        <select
          className="gov-select"
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          aria-label="Filter queue by district"
        >
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Batch Verification Action Bar */}
      {selectedKeys.size > 0 && (
        <div
          className="gov-card"
          style={{
            padding: "10px 14px",
            background: "#eef8f2",
            borderColor: "#005a2b",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
          }}
        >
          <strong style={{ fontSize: 13, color: "#0b2615" }}>
            {selectedKeys.size} selected
          </strong>

          {bulkToStatus ? (
            <>
              <select
                className="gov-select"
                style={{ fontSize: 12 }}
                value={bulkToStatus}
                onChange={(e) => setBulkToStatus(e.target.value)}
              >
                {getAllowedForRole(
                  activeQueue === "district"
                    ? "district_review"
                    : activeQueue === "national"
                      ? "national_review"
                      : activeQueue
                ).map((st) => (
                  <option key={st} value={st}>
                    Transition → {st}
                  </option>
                ))}
              </select>

              <input
                type="text"
                className="gov-input"
                style={{ flex: "1 1 200px", fontSize: 12 }}
                placeholder={
                  bulkToStatus === "rejected"
                    ? "Rejection reason (required)…"
                    : "Batch review note (logged per record)…"
                }
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
              />

              <button
                type="button"
                className={`gov-btn gov-btn-sm ${
                  bulkToStatus === "rejected" ? "gov-btn-danger" : "gov-btn-primary"
                }`}
                disabled={bulkSubmitting || (bulkToStatus === "rejected" && !bulkNote.trim())}
                onClick={handleBulkTransition}
              >
                {bulkSubmitting
                  ? "Processing batch…"
                  : `Confirm Batch → ${bulkToStatus}`}
              </button>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "#556b5e" }}>
              Active role ({role}) is read-only for this queue.
            </span>
          )}

          <button
            type="button"
            className="gov-btn gov-btn-sm"
            onClick={() => setSelectedKeys(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      {bulkFeedback && (
        <div
          className={`gov-alert ${
            bulkFeedback.type === "ok" ? "gov-alert-green" : "gov-alert-red"
          }`}
        >
          {bulkFeedback.type === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{bulkFeedback.text}</span>
        </div>
      )}

      {/* Worklist Table */}
      <div className="gov-table-wrap">
        <table className="gov-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selectedKeys.size === rows.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all visible records"
                />
              </th>
              <th>Record ID</th>
              <th>Type</th>
              <th>District / Ward</th>
              <th>CEID</th>
              <th>Collected</th>
              <th>Status</th>
              <th>Period</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 28, color: "#5b7063" }}>
                  Loading queue…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 28, color: "#5b7063" }}>
                  No records in the <strong>{activeQueue}</strong> queue.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.evidence_type}-${row.record_id}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(rowKey(row))}
                      onChange={() => toggleRowSelect(row)}
                      aria-label={`Select record ${row.record_id}`}
                    />
                  </td>
                  <td className="gov-mono">{row.record_id}</td>
                  <td>
                    <span className="gov-badge gov-badge-slate" style={{ textTransform: "uppercase" }}>
                      {row.evidence_type}
                    </span>
                  </td>
                  <td>
                    {row.district ?? "—"}
                    {row.ward ? ` · W${row.ward}` : ""}
                  </td>
                  <td className="gov-mono">{row.ceid ?? "—"}</td>
                  <td>{row.collected_at ? row.collected_at.slice(0, 10) : "—"}</td>
                  <td>
                    <span className="gov-badge gov-badge-blue">{row.verification_status}</span>
                  </td>
                  <td>{row.reporting_period ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="gov-btn gov-btn-sm gov-btn-primary"
                      onClick={() => openDrawer(row)}
                    >
                      Review / Transition
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Review & Transition Drawer */}
      {selected && (
        <div className="gov-drawer-backdrop" onClick={() => setSelected(null)}>
          <div className="gov-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="gov-drawer-header">
              <div>
                <div className="gov-metric-label">Verification Review</div>
                <div className="gov-card-title" style={{ marginTop: 2 }}>
                  {selected.evidence_type.toUpperCase()} · {selected.record_id}
                </div>
              </div>
              <button type="button" className="gov-btn gov-btn-sm" onClick={() => setSelected(null)}>
                <X size={14} />
              </button>
            </div>

            <div className="gov-drawer-body">
              <div className="gov-kv-grid">
                <div>
                  <div className="gov-kv-label">Current Status</div>
                  <div className="gov-kv-val">
                    <span className="gov-badge gov-badge-blue">{selected.verification_status}</span>
                  </div>
                </div>
                <div>
                  <div className="gov-kv-label">District / Ward</div>
                  <div className="gov-kv-val">
                    {selected.district ?? "—"} {selected.ward ? `/ Ward ${selected.ward}` : ""}
                  </div>
                </div>
                <div>
                  <div className="gov-kv-label">CEID</div>
                  <div className="gov-kv-val gov-mono">{selected.ceid ?? "—"}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Data Tier</div>
                  <div className="gov-kv-val">{selected.data_tier ?? "—"}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Code List Version</div>
                  <div className="gov-kv-val">{selected.code_list_version ?? "—"}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Reporting Period</div>
                  <div className="gov-kv-val">{selected.reporting_period ?? "Unassigned"}</div>
                </div>
              </div>

              {/* GPS Location Preview */}
              {selected.lat != null && selected.lng != null && (
                <div>
                  <div className="gov-kv-label" style={{ marginBottom: 6 }}>
                    Field GPS Verification Pin
                  </div>
                  <GovPointMap
                    height={190}
                    points={[
                      {
                        id: selected.record_id,
                        lat: selected.lat,
                        lng: selected.lng,
                        title: `${selected.evidence_type.toUpperCase()} · ${selected.record_id}`,
                        subtitle: `${selected.district ?? "Unknown"}${
                          selected.ceid ? ` · CEID ${selected.ceid}` : ""
                        }`,
                        color: selected.prais_eligible ? "#146c38" : "#175cd3",
                      },
                    ]}
                  />
                </div>
              )}

              {/* Field Photos / Attachments */}
              <div>
                <div className="gov-kv-label" style={{ marginBottom: 6 }}>
                  <Camera size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Field Evidence Photos (EXP-PHOTOS)
                </div>
                {(() => {
                  const matches = photoRows.filter(
                    (p) =>
                      String(p.submission_id ?? "") === String(selected.record_id) ||
                      (selected.uuid && p.uuid === selected.uuid)
                  );
                  if (matches.length === 0) {
                    return (
                      <div className="gov-metric-sub">
                        No photo attachments indexed for this record.
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {matches.map((m, idx) =>
                        m.download_url ? (
                          <a
                            key={idx}
                            href={m.download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="gov-btn gov-btn-sm"
                          >
                            <Camera size={12} /> Photo #{idx + 1}
                          </a>
                        ) : (
                          <span key={idx} className="gov-badge gov-badge-slate">
                            <Camera size={11} /> {m.filename ?? m.source ?? "Archived photo"}
                          </span>
                        )
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* State Transition Form */}
              <div className="gov-card" style={{ padding: 14, background: "#f8fbf9" }}>
                <div className="gov-card-title" style={{ marginBottom: 10 }}>
                  <Send size={15} /> State Transition (Annex E · Role: {role})
                </div>

                {selected.verification_status === "locked" ? (
                  <div className="gov-alert gov-alert-green">
                    <Lock size={15} />
                    <span>
                      This record is <strong>locked</strong> and immutable for PRAIS export.
                    </span>
                  </div>
                ) : getAllowedForRole(selected.verification_status).length === 0 ? (
                  <div className="gov-alert gov-alert-amber">
                    <Lock size={15} />
                    <span>
                      Active role (<strong>{role}</strong>) cannot transition records from{" "}
                      <strong>{selected.verification_status}</strong>. Switch role in the top bar
                      to National Reporting Officer to approve or lock.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleTransition} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <label className="gov-kv-label">Target Status</label>
                      <select
                        className="gov-select"
                        style={{ width: "100%", marginTop: 4 }}
                        value={toStatus}
                        onChange={(e) => setToStatus(e.target.value)}
                      >
                        {getAllowedForRole(selected.verification_status).map((st) => (
                          <option key={st} value={st}>
                            {selected.verification_status} → {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="gov-kv-grid">
                      <div>
                        <label className="gov-kv-label">Actor ID</label>
                        <input
                          type="text"
                          className="gov-input"
                          style={{ width: "100%", marginTop: 4 }}
                          value={actor}
                          onChange={(e) => setActor(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="gov-kv-label">Role</label>
                        <select
                          className="gov-select"
                          style={{ width: "100%", marginTop: 4 }}
                          value={actorRole}
                          onChange={(e) => setActorRole(e.target.value)}
                        >
                          <option value="district_verifier">District verifier</option>
                          <option value="national_reporting_officer">National reporting officer</option>
                        </select>
                      </div>
                    </div>

                    {toStatus === "locked" && (
                      <div>
                        <label className="gov-kv-label">Reporting Period (required to lock)</label>
                        <input
                          type="text"
                          className="gov-input"
                          style={{ width: "100%", marginTop: 4 }}
                          value={reportingPeriod}
                          onChange={(e) => setReportingPeriod(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="gov-kv-label">
                        Verification Note {toStatus === "rejected" ? "(required for rejection)" : "(recommended)"}
                      </label>
                      <textarea
                        className="gov-textarea"
                        rows={3}
                        style={{ width: "100%", marginTop: 4 }}
                        placeholder="Record review note or rejection reason…"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        required={toStatus === "rejected"}
                      />
                    </div>

                    {txMessage && (
                      <div
                        className={`gov-alert ${
                          txMessage.type === "ok" ? "gov-alert-green" : "gov-alert-red"
                        }`}
                      >
                        {txMessage.type === "ok" ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <AlertTriangle size={15} />
                        )}
                        <span>{txMessage.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className={`gov-btn ${
                        toStatus === "rejected" ? "gov-btn-danger" : "gov-btn-primary"
                      }`}
                      disabled={submitting}
                    >
                      {submitting ? "Recording transition…" : `Confirm transition → ${toStatus}`}
                    </button>
                  </form>
                )}
              </div>

              {/* Audit Trail */}
              <div>
                <div className="gov-card-title" style={{ marginBottom: 8 }}>
                  <History size={15} /> Audit Trail
                </div>
                {auditLoading ? (
                  <div className="gov-metric-sub">Loading audit log…</div>
                ) : auditLogs.length === 0 ? (
                  <div className="gov-metric-sub">No transitions recorded in local audit trail yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {auditLogs.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          border: "1px solid #d9e2dc",
                          borderRadius: 8,
                          padding: "8px 11px",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                          <span>
                            {a.from_status} → {a.to_status}
                          </span>
                          <span style={{ color: "#5b7063" }}>
                            {new Date(a.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ color: "#4f6457", marginTop: 2 }}>
                          Actor: {a.actor_id}
                          {a.actor_role ? ` (${a.actor_role})` : ""}
                          {a.reporting_period ? ` · Period: ${a.reporting_period}` : ""}
                        </div>
                        {a.note && <div style={{ marginTop: 4 }}>{a.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function VerificationWorkspacePage() {
  return (
    <Suspense fallback={<div className="gov-card">Loading Verification Workspace…</div>}>
      <VerificationWorkspaceInner />
    </Suspense>
  );
}
