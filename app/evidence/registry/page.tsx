"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import type {
  EvidenceRegistryPackage,
  EvidenceRegistryRow,
} from "@/lib/evidence-registry";

const GovPointMap = dynamic(() => import("@/components/GovPointMap"), { ssr: false });

const STATUS_BADGE: Record<string, string> = {
  locked: "gov-badge-green",
  approved: "gov-badge-blue",
  national_review: "gov-badge-blue",
  district_review: "gov-badge-amber",
  submitted: "gov-badge-slate",
  rejected: "gov-badge-red",
  draft: "gov-badge-slate",
};

function EvidenceRegistryInner() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") ?? "";
  const initialStatus = searchParams.get("verification_status") ?? "";
  const initialPrais = searchParams.get("prais_eligible") === "true";

  const [typeFilter, setTypeFilter] = useState(initialType);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [praisOnly, setPraisOnly] = useState(initialPrais);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<EvidenceRegistryPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EvidenceRegistryRow | null>(null);

  const loadRegistry = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "2000");
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("verification_status", statusFilter);
      if (praisOnly) params.set("prais_eligible", "true");

      const res = await fetch(`/api/evidence/registry?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Evidence registry returned ${res.status}`);
      setData((await res.json()) as EvidenceRegistryPackage);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load evidence registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, praisOnly]);

  const filteredRows = useMemo(() => {
    const rows = data?.records ?? [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.record_id.toLowerCase().includes(q) ||
        (r.uuid ?? "").toLowerCase().includes(q) ||
        (r.district ?? "").toLowerCase().includes(q) ||
        (r.ward ?? "").toLowerCase().includes(q) ||
        (r.ceid ?? "").toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, praisOnly, searchTerm, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = useMemo(
    () => filteredRows.slice(pageStart, pageStart + pageSize),
    [filteredRows, pageStart, pageSize]
  );

  return (
    <>
      <div className="gov-page-header">
        <div>
          <h1 className="gov-page-title">Evidence Registry</h1>
          <p className="gov-page-subtitle">
            Unified search across LDN, Soil Core, and Drylands (ILUP) field submissions under a
            single Annex E governance model.
          </p>
        </div>
        <div className="gov-page-actions">
          <button type="button" className="gov-btn" onClick={loadRegistry} disabled={loading}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <Link href="/verification?queue=submitted" className="gov-btn gov-btn-primary">
            <ClipboardCheck size={14} />
            Open Verification Queues
          </Link>
        </div>
      </div>

      {/* Compact Counts Strip */}
      {data && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "8px 18px",
            padding: "8px 14px",
            background: "#ffffff",
            border: "1px solid #d9e2dc",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          <span>
            <strong>LDN:</strong> {data.counts.ldn}
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong>Soil Cores:</strong> {data.counts.soil}
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong>Drylands:</strong> {data.counts.drylands}
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong style={{ color: "#005a2b" }}>Matching Filter:</strong>{" "}
            <strong>{filteredRows.length}</strong>
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="gov-filters">
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#5b7063",
            }}
          />
          <input
            type="text"
            className="gov-input"
            style={{ width: "100%", paddingLeft: 32 }}
            placeholder="Search by record ID, UUID, district, ward, or CEID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="gov-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by evidence type"
        >
          <option value="">All types</option>
          <option value="ldn">LDN</option>
          <option value="soil">Soil</option>
          <option value="drylands">Drylands</option>
        </select>

        <select
          className="gov-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by verification status"
        >
          <option value="">All statuses</option>
          <option value="submitted">submitted</option>
          <option value="district_review">district_review</option>
          <option value="national_review">national_review</option>
          <option value="approved">approved</option>
          <option value="locked">locked</option>
          <option value="rejected">rejected</option>
        </select>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={praisOnly}
            onChange={(e) => setPraisOnly(e.target.checked)}
          />
          PRAIS eligible only (locked)
        </label>
      </div>

      {error && <div className="gov-alert gov-alert-red">{error}</div>}

      {/* Unified Registry Table (R1 §5 columns) */}
      <div className="gov-table-wrap">
        <table className="gov-table">
          <thead>
            <tr>
              <th>Record ID</th>
              <th>Type</th>
              <th>District / Ward</th>
              <th>CEID</th>
              <th>Collected</th>
              <th>Tier</th>
              <th>Verification Status</th>
              <th>Period</th>
              <th>PRAIS Eligible</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 28, color: "#5b7063" }}>
                  Loading evidence records…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 28, color: "#5b7063" }}>
                  No evidence records match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={`${row.evidence_type}-${row.record_id}`}>
                  <td className="gov-mono">{row.record_id}</td>
                  <td>
                    <span className="gov-badge gov-badge-slate" style={{ textTransform: "uppercase" }}>
                      {row.evidence_type}
                    </span>
                  </td>
                  <td>
                    <div>{row.district ?? "—"}</div>
                    {row.ward && (
                      <div style={{ fontSize: 11, color: "#5b7063" }}>Ward {row.ward}</div>
                    )}
                  </td>
                  <td className="gov-mono">{row.ceid ?? "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {row.collected_at ? row.collected_at.slice(0, 10) : "—"}
                  </td>
                  <td>{row.data_tier ?? "—"}</td>
                  <td>
                    <span
                      className={`gov-badge ${
                        STATUS_BADGE[row.verification_status] ?? "gov-badge-slate"
                      }`}
                    >
                      {row.verification_status}
                    </span>
                  </td>
                  <td>{row.reporting_period ?? "—"}</td>
                  <td>
                    {row.prais_eligible ? (
                      <span className="gov-badge gov-badge-green">
                        <CheckCircle2 size={11} /> Eligible
                      </span>
                    ) : (
                      <span className="gov-badge gov-badge-slate">No</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="gov-btn gov-btn-sm"
                      onClick={() => setSelected(row)}
                    >
                      <Eye size={12} /> Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "8px 14px",
            background: "#ffffff",
            border: "1px solid #d9e2dc",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          <span style={{ color: "#4f6457" }}>
            Showing <strong>{pageStart + 1}</strong>–
            <strong>{Math.min(pageStart + pageSize, filteredRows.length)}</strong> of{" "}
            <strong>{filteredRows.length}</strong> records (Page {safePage} of {totalPages})
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <select
              className="gov-select"
              style={{ fontSize: 12, padding: "4px 8px" }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Rows per page"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              type="button"
              className="gov-btn gov-btn-sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="gov-btn gov-btn-sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Slide-Over Drawer */}
      {selected && (
        <div className="gov-drawer-backdrop" onClick={() => setSelected(null)}>
          <div className="gov-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="gov-drawer-header">
              <div>
                <div className="gov-metric-label">Evidence Record Detail</div>
                <div className="gov-card-title" style={{ marginTop: 2 }}>
                  {selected.evidence_type.toUpperCase()} · {selected.record_id}
                </div>
              </div>
              <button type="button" className="gov-btn gov-btn-sm" onClick={() => setSelected(null)}>
                <X size={14} />
              </button>
            </div>

            <div className="gov-drawer-body">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  className={`gov-badge ${
                    STATUS_BADGE[selected.verification_status] ?? "gov-badge-slate"
                  }`}
                >
                  Status: {selected.verification_status}
                </span>
                <span
                  className={`gov-badge ${
                    selected.prais_eligible ? "gov-badge-green" : "gov-badge-slate"
                  }`}
                >
                  {selected.prais_eligible ? "PRAIS Eligible (Locked)" : "Not PRAIS Eligible"}
                </span>
              </div>

              <div className="gov-kv-grid">
                <div>
                  <div className="gov-kv-label">Record ID</div>
                  <div className="gov-kv-val gov-mono">{selected.record_id}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Submission UUID</div>
                  <div className="gov-kv-val gov-mono">{selected.uuid ?? "—"}</div>
                </div>
                <div>
                  <div className="gov-kv-label">District</div>
                  <div className="gov-kv-val">{selected.district ?? "—"}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Ward</div>
                  <div className="gov-kv-val">{selected.ward ?? "—"}</div>
                </div>
                <div>
                  <div className="gov-kv-label">CEID</div>
                  <div className="gov-kv-val gov-mono">{selected.ceid ?? "—"}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Coordinates</div>
                  <div className="gov-kv-val gov-mono">
                    {selected.lat != null && selected.lng != null
                      ? `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="gov-kv-label">Collected At</div>
                  <div className="gov-kv-val">{selected.collected_at ?? "—"}</div>
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

              {selected.lat != null && selected.lng != null && (
                <div>
                  <div className="gov-kv-label" style={{ marginBottom: 6 }}>
                    Record Location Preview
                  </div>
                  <GovPointMap
                    height={210}
                    points={[
                      {
                        id: selected.record_id,
                        lat: selected.lat,
                        lng: selected.lng,
                        title: `${selected.evidence_type.toUpperCase()} · ${selected.record_id}`,
                        subtitle: `${selected.district ?? "Unknown district"}${
                          selected.ceid ? ` · CEID ${selected.ceid}` : ""
                        }`,
                        color: selected.prais_eligible ? "#146c38" : "#175cd3",
                      },
                    ]}
                  />
                </div>
              )}

              <div className="gov-alert gov-alert-amber">
                Field values are read-only on web (mobile-only collection policy). To advance
                verification status or assign a reporting period, use the Verification Workspace.
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/verification?queue=${
                    selected.verification_status === "district_review"
                      ? "district"
                      : selected.verification_status === "national_review"
                        ? "national"
                        : selected.verification_status
                  }`}
                  className="gov-btn gov-btn-primary"
                >
                  <ClipboardCheck size={14} /> Open in Verification Workspace
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function EvidenceRegistryPage() {
  return (
    <Suspense fallback={<div className="gov-card">Loading Evidence Registry…</div>}>
      <EvidenceRegistryInner />
    </Suspense>
  );
}
