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
  { code: "tree_covered", label: "Tree-covered", color: "#15803d" },
  { code: "grassland", label: "Grassland", color: "#84cc16" },
  { code: "cropland", label: "Cropland", color: "#eab308" },
  { code: "wetland", label: "Wetland", color: "#0891b2" },
  { code: "artificial", label: "Artificial", color: "#dc2626" },
  { code: "other_land", label: "Other land", color: "#a8a29e" },
  { code: "water", label: "Water", color: "#2563eb" },
] as const;

type TransitionDirection = "degradation" | "stable" | "improvement";

/**
 * UNCCD GPG SDG 15.3.1 v2 default 7×7 Land Cover Transition rules
 * (- = degradation, 0 = stable, + = improvement)
 */
const UNCCD_TRANSITION_RULES: Record<string, Record<string, TransitionDirection>> = {
  tree_covered: {
    tree_covered: "stable",
    grassland: "degradation",
    cropland: "degradation",
    wetland: "degradation",
    artificial: "degradation",
    other_land: "degradation",
    water: "stable",
  },
  grassland: {
    tree_covered: "improvement",
    grassland: "stable",
    cropland: "improvement",
    wetland: "degradation",
    artificial: "degradation",
    other_land: "degradation",
    water: "stable",
  },
  cropland: {
    tree_covered: "improvement",
    grassland: "degradation",
    cropland: "stable",
    wetland: "degradation",
    artificial: "degradation",
    other_land: "degradation",
    water: "stable",
  },
  wetland: {
    tree_covered: "degradation",
    grassland: "degradation",
    cropland: "degradation",
    wetland: "stable",
    artificial: "degradation",
    other_land: "degradation",
    water: "stable",
  },
  artificial: {
    tree_covered: "improvement",
    grassland: "improvement",
    cropland: "improvement",
    wetland: "improvement",
    artificial: "stable",
    other_land: "improvement",
    water: "stable",
  },
  other_land: {
    tree_covered: "improvement",
    grassland: "improvement",
    cropland: "improvement",
    wetland: "improvement",
    artificial: "degradation",
    other_land: "stable",
    water: "stable",
  },
  water: {
    tree_covered: "stable",
    grassland: "stable",
    cropland: "stable",
    wetland: "stable",
    artificial: "stable",
    other_land: "stable",
    water: "stable",
  },
};

function getTransitionRule(from: string, to: string): TransitionDirection {
  return UNCCD_TRANSITION_RULES[from]?.[to] ?? "stable";
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<TabId>("lc");
  const [lc, setLc] = useState<So1LcPayload | null>(null);
  const [lpd, setLpd] = useState<So1LpdPayload | null>(null);
  const [soc, setSoc] = useState<So1SocPayload | null>(null);
  const [status, setStatus] = useState<So1StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lcFilter, setLcFilter] = useState<"all" | TransitionDirection>("all");
  const [selectedCell, setSelectedCell] = useState<{ from: string; to: string } | null>(null);

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
      {tab === "lc" && (() => {
        let populatedCount = 0;
        let degTotal = 0;
        let impTotal = 0;
        let stabTotal = 0;
        const rowTotals: Record<string, number | null> = {};
        const colTotals: Record<string, number | null> = {};

        for (const f of UNCCD_CLASSES) {
          let rSum = 0;
          let rHas = false;
          for (const t of UNCCD_CLASSES) {
            const v = lcLookup.get(`${f.code}__${t.code}`);
            if (v != null) {
              populatedCount++;
              rSum += v;
              rHas = true;
              const rule = getTransitionRule(f.code, t.code);
              if (rule === "degradation") degTotal += v;
              else if (rule === "improvement") impTotal += v;
              else stabTotal += v;
            }
          }
          rowTotals[f.code] = rHas ? rSum : null;
        }

        for (const t of UNCCD_CLASSES) {
          let cSum = 0;
          let cHas = false;
          for (const f of UNCCD_CLASSES) {
            const v = lcLookup.get(`${f.code}__${t.code}`);
            if (v != null) {
              cSum += v;
              cHas = true;
            }
          }
          colTotals[t.code] = cHas ? cSum : null;
        }

        const grandTotal = populatedCount > 0 ? degTotal + impTotal + stabTotal : null;

        const cellStyle = (dir: TransitionDirection, dimmed: boolean, isSelected: boolean): React.CSSProperties => {
          const palette: Record<TransitionDirection, { bg: string; fg: string; border: string }> = {
            degradation: { bg: "#fef2f2", fg: "#b42318", border: "#fecaca" },
            improvement: { bg: "#ecfdf3", fg: "#146c38", border: "#bbf7d0" },
            stable: { bg: "#f6f8f7", fg: "#465d50", border: "#e2e8e4" },
          };
          const p = palette[dir];
          return {
            background: p.bg,
            color: p.fg,
            opacity: dimmed ? 0.25 : 1,
            cursor: "pointer",
            textAlign: "center",
            borderRight: "1px solid #e7eeea",
            outline: isSelected ? "2px solid #005a2b" : undefined,
            outlineOffset: isSelected ? -2 : undefined,
            transition: "opacity 0.15s ease, background 0.15s ease",
            padding: "10px 8px",
          };
        };

        const labelFor = (code: string) =>
          UNCCD_CLASSES.find((c) => c.code === code)?.label ?? code;

        return (
          <div className="gov-card">
            <div className="gov-card-header">
              <div>
                <div className="gov-card-title">
                  SO1-1 Land Cover Transition Matrix (UNCCD 7-Class · km²)
                </div>
                <div className="gov-metric-sub" style={{ marginTop: 2 }}>
                  Baseline <strong>t₀ (end 2015)</strong> rows → Reporting{" "}
                  <strong>t₁ ({lc?.reporting_period ?? "2020-2023"})</strong> columns · Default
                  UNCCD GPG v2 transition rules shown per cell.
                </div>
              </div>
              <a href="/api/export/so1-lc?format=csv" className="gov-btn gov-btn-sm">
                <Download size={13} /> Download Matrix CSV
              </a>
            </div>

            <div className="gov-alert gov-alert-amber" style={{ marginBottom: 14 }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong>National Land Cover Raster Pending:</strong> National t₀/t₁ land-cover
                GeoTIFF surfaces (<code>LC-NAT-STACK</code>) are scheduled for ingestion (
                {populatedCount}/49 cells populated). Cell colors reflect official UNCCD GPG v2
                degradation/improvement transition rules.
              </span>
            </div>

            {/* Matrix Summary & Legend Controls */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button
                  type="button"
                  className={`gov-btn gov-btn-sm ${lcFilter === "all" ? "gov-btn-primary" : ""}`}
                  onClick={() => setLcFilter("all")}
                >
                  All Cells (49)
                </button>
                <button
                  type="button"
                  className="gov-btn gov-btn-sm"
                  style={{
                    background: lcFilter === "degradation" ? "#b42318" : "#fef2f2",
                    color: lcFilter === "degradation" ? "#ffffff" : "#b42318",
                    borderColor: "#f7c3c3",
                  }}
                  onClick={() => setLcFilter("degradation")}
                >
                  − Degradation ({populatedCount > 0 ? `${degTotal.toLocaleString()} km²` : "18 rules"})
                </button>
                <button
                  type="button"
                  className="gov-btn gov-btn-sm"
                  style={{
                    background: lcFilter === "stable" ? "#3d5246" : "#f4f7f5",
                    color: lcFilter === "stable" ? "#ffffff" : "#3d5246",
                    borderColor: "#d1dbd5",
                  }}
                  onClick={() => setLcFilter("stable")}
                >
                  0 Stable ({populatedCount > 0 ? `${stabTotal.toLocaleString()} km²` : "19 rules"})
                </button>
                <button
                  type="button"
                  className="gov-btn gov-btn-sm"
                  style={{
                    background: lcFilter === "improvement" ? "#146c38" : "#ecfdf3",
                    color: lcFilter === "improvement" ? "#ffffff" : "#146c38",
                    borderColor: "#b8e6c8",
                  }}
                  onClick={() => setLcFilter("improvement")}
                >
                  + Improvement ({populatedCount > 0 ? `${impTotal.toLocaleString()} km²` : "12 rules"})
                </button>
              </div>

              <span className="gov-badge gov-badge-slate">
                Click any cell to inspect UNCCD transition rule
              </span>
            </div>

            {/* Enhanced 7×7 Pivot Matrix */}
            <div className="gov-table-wrap">
              <table className="gov-table" style={{ tableLayout: "fixed", minWidth: 880 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        width: 160,
                        background: "#eef4f0",
                        borderRight: "2px solid #cbd7cf",
                        whiteSpace: "normal",
                        lineHeight: 1.25,
                      }}
                    >
                      Baseline t₀ ↓ / t₁ →
                    </th>
                    {UNCCD_CLASSES.map((c) => (
                      <th key={c.code} style={{ textAlign: "center", padding: "10px 6px" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: c.color,
                              flexShrink: 0,
                            }}
                          />
                          <span>{c.label}</span>
                        </div>
                      </th>
                    ))}
                    <th
                      style={{
                        width: 105,
                        textAlign: "right",
                        background: "#eef4f0",
                        borderLeft: "2px solid #cbd7cf",
                      }}
                    >
                      t₀ Total (km²)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {UNCCD_CLASSES.map((from) => (
                    <tr key={from.code}>
                      <td
                        style={{
                          fontWeight: 700,
                          background: "#f9fbfa",
                          borderRight: "2px solid #cbd7cf",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: "50%",
                              background: from.color,
                              flexShrink: 0,
                            }}
                          />
                          <span>{from.label}</span>
                        </div>
                      </td>
                      {UNCCD_CLASSES.map((to) => {
                        const val = lcLookup.get(`${from.code}__${to.code}`);
                        const dir = getTransitionRule(from.code, to.code);
                        const symbol = dir === "degradation" ? "−" : dir === "improvement" ? "+" : "0";
                        const dimmed = lcFilter !== "all" && lcFilter !== dir;
                        const isSel =
                          selectedCell?.from === from.code && selectedCell?.to === to.code;
                        return (
                          <td
                            key={to.code}
                            style={cellStyle(dir, dimmed, isSel)}
                            onClick={() => setSelectedCell({ from: from.code, to: to.code })}
                            title={`${from.label} → ${to.label}: UNCCD ${dir.toUpperCase()} (${
                              val != null ? `${val} km²` : "awaiting national raster"
                            })`}
                          >
                            <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1 }}>
                              {val != null ? val.toLocaleString() : symbol}
                            </div>
                            <div style={{ fontSize: 10, opacity: 0.72, marginTop: 2 }}>
                              {val != null ? "km²" : "pending"}
                            </div>
                          </td>
                        );
                      })}
                      <td
                        className="gov-mono"
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          background: "#f9fbfa",
                          borderLeft: "2px solid #cbd7cf",
                        }}
                      >
                        {rowTotals[from.code] != null
                          ? rowTotals[from.code]!.toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#eef4f0", borderTop: "2px solid #cbd7cf" }}>
                    <td style={{ fontWeight: 800, borderRight: "2px solid #cbd7cf" }}>
                      t₁ Total (km²)
                    </td>
                    {UNCCD_CLASSES.map((c) => (
                      <td
                        key={c.code}
                        className="gov-mono"
                        style={{ textAlign: "center", fontWeight: 700 }}
                      >
                        {colTotals[c.code] != null ? colTotals[c.code]!.toLocaleString() : "—"}
                      </td>
                    ))}
                    <td
                      className="gov-mono"
                      style={{
                        textAlign: "right",
                        fontWeight: 800,
                        borderLeft: "2px solid #cbd7cf",
                      }}
                    >
                      {grandTotal != null ? grandTotal.toLocaleString() : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Interactive Cell Inspector Strip */}
            {selectedCell && (() => {
              const dir = getTransitionRule(selectedCell.from, selectedCell.to);
              const val = lcLookup.get(`${selectedCell.from}__${selectedCell.to}`);
              return (
                <div
                  className="gov-card"
                  style={{
                    marginTop: 14,
                    padding: "12px 16px",
                    background: "#f8fbf9",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div className="gov-kv-label">Selected Transition Cell</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                      {labelFor(selectedCell.from)} → {labelFor(selectedCell.to)}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span
                      className={`gov-badge ${
                        dir === "degradation"
                          ? "gov-badge-red"
                          : dir === "improvement"
                            ? "gov-badge-green"
                            : "gov-badge-slate"
                      }`}
                    >
                      UNCCD Rule: {dir.toUpperCase()}
                    </span>
                    <span className="gov-badge gov-badge-blue">
                      Area: {val != null ? `${val.toLocaleString()} km²` : "Pending National LC Raster"}
                    </span>
                    <span className="gov-badge gov-badge-slate">Baseline: t0_end_2015</span>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

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
              <strong>National Productivity (LPD) Raster Pending:</strong> National LPD surface (
              <code>LPD-NAT-RASTER</code>) is awaiting final GIS ingestion.
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
              <strong>Tier-1 National SOC Surface Pending:</strong> National Tier-1 SOC surface is
              scheduled for ingestion;{" "}
              <strong>{soc?.stats.tier2_total ?? 0}</strong> EMA Tier-2 soil survey sites are
              loaded ({soc?.stats.tier2_with_soc_value ?? 0} with verified laboratory SOC %).
            </span>
          </div>

          {soc && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px 18px",
                padding: "9px 14px",
                background: "#ffffff",
                border: "1px solid #d9e2dc",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <span>
                <strong>Tier-2 Soil Sites:</strong> {soc.stats.tier2_total}
              </span>
              <span style={{ color: "#cbd7cf" }}>|</span>
              <span>
                <strong>0–30 cm Topsoil Coverage:</strong>{" "}
                <strong style={{ color: "#005a2b" }}>{soc.stats.tier2_depth_0_30}</strong>
              </span>
              <span style={{ color: "#cbd7cf" }}>|</span>
              <span>
                <strong>Verified Lab SOC %:</strong>{" "}
                <strong style={{ color: "#1d4ed8" }}>{soc.stats.tier2_with_soc_value}</strong>
              </span>
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

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px 18px",
              padding: "10px 14px",
              background: "#f8fbf9",
              border: "1px solid #d9e2dc",
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            <span>
              <strong>Degraded Area (Interim):</strong>{" "}
              <strong style={{ color: "#b42318", fontSize: 14 }}>
                {status.summary.degraded_area_percent != null
                  ? `${status.summary.degraded_area_percent.toFixed(2)}%`
                  : "—"}
              </strong>
            </span>
            <span style={{ color: "#cbd7cf" }}>|</span>
            <span>
              <strong>Polygons Aggregated:</strong>{" "}
              <strong>{status.summary.polygon_count?.toLocaleString() ?? "254,873"}</strong>
            </span>
            <span style={{ color: "#cbd7cf" }}>|</span>
            <span>
              <strong>Area Unit:</strong>{" "}
              {status.metadata.area_unit_confirmed ? "Confirmed" : "In Review"}
            </span>
            <span style={{ color: "#cbd7cf" }}>|</span>
            <span>
              <strong>1OAO Status:</strong>{" "}
              <span
                className={`gov-badge ${
                  status.metadata.one_ao_ready ? "gov-badge-green" : "gov-badge-amber"
                }`}
              >
                {status.metadata.one_ao_ready ? "1OAO Complete" : "Pending National Rasters"}
              </span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
