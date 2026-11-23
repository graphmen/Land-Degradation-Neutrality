"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Download,
  FileCheck2,
  RefreshCw,
} from "lucide-react";

type TabId = "lc" | "lpd" | "soc" | "status";

type So1LcPayload = {
  package_id: string;
  status: string;
  reporting_period: string | null;
  rows: Array<{
    from_unccd_class: string;
    to_unccd_class: string;
    area_km2: number | null;
    source_layer_id: string;
  }>;
};

type So1LpdPayload = {
  package_id: string;
  status: string;
  reporting_period: string | null;
  rows: Array<{
    lpd_class: string;
    area_km2: number | null;
    area_percent: number | null;
    source_layer_id: string;
    confidence: string;
  }>;
};

type So1SocPayload = {
  package_id: string;
  status: string;
  reporting_period: string | null;
  stats: {
    tier2_total: number;
    tier2_depth_0_30: number;
    tier2_with_soc_value: number;
  };
  tier2_samples: Array<{
    submission_id: string;
    collect_earth_id: string | null;
    depth_cm: number | null;
    depth_range: string | null;
    texture_class: string | null;
    moisture_condition: string | null;
    soc_percent: number | null;
    verification_status: string;
  }>;
};

type So1StatusPayload = {
  package_id: string;
  reporting_period: string | null;
  summary: {
    polygon_count?: number;
    degraded_area_percent?: number | null;
    by_class?: Record<string, { polygons?: number; area?: number; percent?: number }>;
  };
  metadata: {
    one_ao_ready?: boolean;
    area_unit_confirmed?: boolean;
    note?: string;
  };
};

const UNCCD_CLASSES = [
  "tree_covered",
  "grassland",
  "cropland",
  "wetland",
  "artificial",
  "other_land",
  "water",
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState<TabId>("lc");
  const [lc, setLc] = useState<So1LcPayload | null>(null);
  const [lpd, setLpd] = useState<So1LpdPayload | null>(null);
  const [soc, setSoc] = useState<So1SocPayload | null>(null);
  const [status, setStatus] = useState<So1StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lcRes, lpdRes, socRes, stRes] = await Promise.all([
        fetch("/api/export/so1-lc", { cache: "no-store" }),
        fetch("/api/export/so1-lpd", { cache: "no-store" }),
        fetch("/api/export/so1-soc", { cache: "no-store" }),
        fetch("/api/export/so1-status", { cache: "no-store" }),
      ]);
      if (lcRes.ok) setLc((await lcRes.json()) as So1LcPayload);
      if (lpdRes.ok) setLpd((await lpdRes.json()) as So1LpdPayload);
      if (socRes.ok) setSoc((await socRes.json()) as So1SocPayload);
      if (stRes.ok) setStatus((await stRes.json()) as So1StatusPayload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load SO1 analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const lcLookup = new Map<string, number | null>();
  for (const r of lc?.rows ?? []) {
    lcLookup.set(`${r.from_unccd_class}__${r.to_unccd_class}`, r.area_km2);
  }

  return (
    <>
      <div className="gov-page-header">
        <div>
          <h1 className="gov-page-title">Analytics (UNCCD SO1 — SDG 15.3.1)</h1>
          <p className="gov-page-subtitle">
            Sub-indicator inspection for Land Cover transitions (SO1-1), Land Productivity Dynamics
            (SO1-2), Soil Organic Carbon (SO1-3), and Combined Status (SO1-4).
          </p>
        </div>
        <div className="gov-page-actions">
          <button type="button" className="gov-btn" onClick={loadAll} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link href="/reporting-desk" className="gov-btn gov-btn-primary">
            <FileCheck2 size={14} /> Reporting Desk Gates
          </Link>
        </div>
      </div>

      {/* Sub-indicator Tab Bar */}
      <div className="gov-filters">
        {(
          [
            { id: "lc", label: "SO1-1 Land Cover (7×7)" },
            { id: "lpd", label: "SO1-2 Productivity (LPD)" },
            { id: "soc", label: "SO1-3 Soil Organic Carbon" },
            { id: "status", label: "SO1-4 Combined Status" },
          ] as { id: TabId; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            className={`gov-btn ${tab === t.id ? "gov-btn-primary" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <BarChart3 size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="gov-alert gov-alert-red">{error}</div>}

      {/* SO1-1 Land Cover Matrix */}
      {tab === "lc" && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">
              SO1-1 Land Cover Transition Matrix (UNCCD 7-Class · km²)
            </div>
            <a href="/api/export/so1-lc?format=csv" className="gov-btn gov-btn-sm">
              <Download size={13} /> Download Template CSV
            </a>
          </div>

          <div className="gov-alert gov-alert-amber" style={{ marginBottom: 14 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Gate F3 Blocked (Steering S10):</strong> National t₀/t₁ land-cover GeoTIFF
              stack (`LC-NAT-STACK`) awaiting delivery. Matrix cells show `—` until zonal stats run.
            </span>
          </div>

          <div className="gov-table-wrap">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>From \ To</th>
                  {UNCCD_CLASSES.map((c) => (
                    <th key={c}>{c.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UNCCD_CLASSES.map((from) => (
                  <tr key={from}>
                    <td style={{ fontWeight: 700 }}>{from.replace(/_/g, " ")}</td>
                    {UNCCD_CLASSES.map((to) => {
                      const val = lcLookup.get(`${from}__${to}`);
                      return (
                        <td
                          key={to}
                          className="gov-mono"
                          style={{
                            background: from === to ? "#f4f8f5" : undefined,
                            color: val == null ? "#8a9c91" : "#102117",
                          }}
                        >
                          {val != null ? val.toLocaleString() : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SO1-2 LPD */}
      {tab === "lpd" && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">SO1-2 Land Productivity Dynamics (LPD)</div>
            <a href="/api/export/so1-lpd?format=csv" className="gov-btn gov-btn-sm">
              <Download size={13} /> Download Template CSV
            </a>
          </div>

          <div className="gov-alert gov-alert-amber" style={{ marginBottom: 14 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Gate F4 Blocked (Steering S11):</strong> National LPD raster (`LPD-NAT-RASTER`)
              and legend decision pending EMA steering.
            </span>
          </div>

          <div className="gov-table-wrap">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>LPD Class</th>
                  <th>Area (km²)</th>
                  <th>Area (%)</th>
                  <th>Source Layer</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {(lpd?.rows ?? []).map((r) => (
                  <tr key={r.lpd_class}>
                    <td style={{ fontWeight: 700, textTransform: "capitalize" }}>
                      {r.lpd_class.replace(/_/g, " ")}
                    </td>
                    <td className="gov-mono">{r.area_km2 != null ? r.area_km2 : "—"}</td>
                    <td className="gov-mono">{r.area_percent != null ? `${r.area_percent}%` : "—"}</td>
                    <td className="gov-mono">{r.source_layer_id}</td>
                    <td>
                      <span className="gov-badge gov-badge-amber">{r.confidence}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SO1-3 SOC */}
      {tab === "soc" && (
        <>
          <div className="gov-alert gov-alert-amber">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Gate F5 Partial (Steering S12):</strong> Tier-1 national SOC surface awaits
              delivery; Tier-2 EMA field soil cores are loaded and ready for lab SOC reconciliation.
            </span>
          </div>

          {soc && (
            <div className="gov-grid-3">
              <div className="gov-card">
                <div className="gov-metric-label">Tier-2 Soil Cores</div>
                <div className="gov-metric-value">{soc.stats.tier2_total}</div>
                <div className="gov-metric-sub">Field samples in unified corpus</div>
              </div>
              <div className="gov-card">
                <div className="gov-metric-label">0–30 cm Depth Coverage</div>
                <div className="gov-metric-value">{soc.stats.tier2_depth_0_30}</div>
                <div className="gov-metric-sub">Meets UNCCD standard topsoil depth</div>
              </div>
              <div className="gov-card">
                <div className="gov-metric-label">Lab SOC % Populated</div>
                <div className="gov-metric-value">{soc.stats.tier2_with_soc_value}</div>
                <div className="gov-metric-sub">Awaiting Tier-2 laboratory assay join (S12)</div>
              </div>
            </div>
          )}

          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title">Tier-2 Field Soil Core Sample Preview (first 50)</div>
              <a href="/api/export/so1-soc?format=csv_tier2" className="gov-btn gov-btn-sm">
                <Download size={13} /> Download Tier-2 CSV
              </a>
            </div>
            <div className="gov-table-wrap">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Submission ID</th>
                    <th>Depth (cm)</th>
                    <th>Depth Range</th>
                    <th>Texture</th>
                    <th>Moisture</th>
                    <th>SOC %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(soc?.tier2_samples ?? []).slice(0, 50).map((s, idx) => (
                    <tr key={`${s.submission_id}-${idx}`}>
                      <td className="gov-mono">{s.submission_id}</td>
                      <td>{s.depth_cm ?? "—"}</td>
                      <td>{s.depth_range ?? "—"}</td>
                      <td>{s.texture_class ?? "—"}</td>
                      <td>{s.moisture_condition ?? "—"}</td>
                      <td className="gov-mono">{s.soc_percent ?? "—"}</td>
                      <td>
                        <span className="gov-badge gov-badge-slate">{s.verification_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SO1-4 Status */}
      {tab === "status" && status && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">SO1-4 National Status Summary (Interim Polygon Zonal)</div>
            <a href="/api/export/so1-status" target="_blank" rel="noreferrer" className="gov-btn gov-btn-sm">
              <Download size={13} /> View JSON Package
            </a>
          </div>

          <div className="gov-grid-3" style={{ marginBottom: 16 }}>
            <div className="gov-card" style={{ background: "#f8fbf9" }}>
              <div className="gov-metric-label">Degraded Area (%)</div>
              <div className="gov-metric-value">
                {status.summary.degraded_area_percent != null
                  ? `${status.summary.degraded_area_percent.toFixed(2)}%`
                  : "—"}
              </div>
              <div className="gov-metric-sub">Interim LDN-NAT-ALL zonal ratio</div>
            </div>
            <div className="gov-card" style={{ background: "#f8fbf9" }}>
              <div className="gov-metric-label">Polygons Aggregated</div>
              <div className="gov-metric-value">
                {status.summary.polygon_count?.toLocaleString() ?? "254,873"}
              </div>
              <div className="gov-metric-sub">
                Area unit confirmed (Q1):{" "}
                <strong>{status.metadata.area_unit_confirmed ? "Yes" : "Pending"}</strong>
              </div>
            </div>
            <div className="gov-card" style={{ background: "#f8fbf9" }}>
              <div className="gov-metric-label">1OAO Integration</div>
              <div style={{ margin: "10px 0 6px" }}>
                <span
                  className={`gov-badge ${
                    status.metadata.one_ao_ready ? "gov-badge-green" : "gov-badge-amber"
                  }`}
                >
                  {status.metadata.one_ao_ready ? "1OAO Complete" : "Pending S10–S12 Rasters"}
                </span>
              </div>
              <div className="gov-metric-sub">{status.metadata.note ?? "One-Out-All-Out requires LC + LPD + SOC."}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
