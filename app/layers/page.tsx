"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Columns2,
  Download,
  Info,
  Layers,
  Lock,
  Map as MapIcon,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  X,
} from "lucide-react";
import type { CorpusLayerRow } from "@/lib/corpus-manifest";
import type { GovMapLegendItem, GovMapPoint } from "@/components/GovPointMap";
import { useGovPlatform } from "@/components/GovPlatformContext";

const GovPointMap = dynamic(() => import("@/components/GovPointMap"), { ssr: false });

type CorpusLayersPayload = {
  package_id: string;
  layer_count: number;
  generated_at: string;
  layers: CorpusLayerRow[];
  validation: { pass: boolean; missing: string[] };
};

type So1StatusSummary = {
  summary?: {
    degraded_area_percent?: number | null;
    polygon_count?: number;
  };
  metadata?: {
    one_ao_ready?: boolean;
  };
};

type OverlayKey = "field_ldn" | "ref_sites" | "int_projects" | "press_invasive" | "press_mining";

type OverlayConfig = {
  key: OverlayKey;
  layerId: string;
  label: string;
  ldnRole: string;
  color: string;
  restricted?: boolean;
};

const OVERLAY_CONFIGS: OverlayConfig[] = [
  {
    key: "field_ldn",
    layerId: "FIELD-LDN",
    label: "LDN Field Validations",
    ldnRole: "SO1 Verification",
    color: "#005a2b",
  },
  {
    key: "ref_sites",
    layerId: "REF-SITES",
    label: "EMA Monitoring Sites",
    ldnRole: "Operations QA",
    color: "#0891b2",
  },
  {
    key: "int_projects",
    layerId: "INT-PROJECTS",
    label: "Restoration Projects",
    ldnRole: "SO4 Bright Spots",
    color: "#1d4ed8",
  },
  {
    key: "press_invasive",
    layerId: "PRESS-INVASIVE",
    label: "Invasive Species",
    ldnRole: "SO1-2 Driver",
    color: "#d97706",
  },
  {
    key: "press_mining",
    layerId: "PRESS-MINING",
    label: "Illegal Mining",
    ldnRole: "SO2 Driver",
    color: "#b42318",
    restricted: true,
  },
];

const STATUS_CLASS: Record<string, string> = {
  etl_complete: "gov-badge-green",
  json_loaded: "gov-badge-green",
  staging_json: "gov-badge-blue",
  partial: "gov-badge-blue",
  plan_only: "gov-badge-amber",
  awaiting_delivery: "gov-badge-red",
  not_started: "gov-badge-slate",
};

type ViewMode = "split" | "map" | "table";
type TableTab = "catalogue" | "features";

export default function NationalLayersPage() {
  const { role, permissions } = useGovPlatform();
  const [data, setData] = useState<CorpusLayersPayload | null>(null);
  const [so1Status, setSo1Status] = useState<So1StatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [tableTab, setTableTab] = useState<TableTab>("catalogue");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<CorpusLayerRow | null>(null);

  // Multi-layer spatial overlay state
  const [activeOverlays, setActiveOverlays] = useState<Record<OverlayKey, boolean>>({
    field_ldn: true,
    ref_sites: true,
    int_projects: true,
    press_invasive: false,
    press_mining: false,
  });
  const [overlayCache, setOverlayCache] = useState<Partial<Record<OverlayKey, GovMapPoint[]>>>({});
  const [mapLoading, setMapLoading] = useState(false);

  const loadCore = async () => {
    setLoading(true);
    setError(null);
    try {
      const [layersRes, stRes] = await Promise.all([
        fetch("/api/corpus-layers", { cache: "no-store" }),
        fetch("/api/export/so1-status", { cache: "no-store" }),
      ]);
      if (!layersRes.ok) throw new Error(`Corpus layers API returned ${layersRes.status}`);
      setData((await layersRes.json()) as CorpusLayersPayload);
      if (stRes.ok) setSo1Status((await stRes.json()) as So1StatusSummary);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load national layers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCore();
  }, []);

  // Automatically disable restricted mining overlay if role loses permission
  useEffect(() => {
    if (!permissions.canViewRestrictedLayers && activeOverlays.press_mining) {
      setActiveOverlays((prev) => ({ ...prev, press_mining: false }));
    }
  }, [permissions.canViewRestrictedLayers, activeOverlays.press_mining]);

  // Fetch any newly enabled overlay that isn't cached yet
  useEffect(() => {
    const missing = (Object.keys(activeOverlays) as OverlayKey[]).filter(
      (k) => activeOverlays[k] && !overlayCache[k]
    );
    if (missing.length === 0) return;

    let cancelled = false;
    async function fetchOverlays() {
      setMapLoading(true);
      try {
        const updates: Partial<Record<OverlayKey, GovMapPoint[]>> = {};

        await Promise.all(
          missing.map(async (key) => {
            if (key === "field_ldn") {
              const res = await fetch("/api/evidence/registry?type=ldn&limit=300", {
                cache: "no-store",
              });
              if (!res.ok) return;
              const json = (await res.json()) as {
                records?: Array<{
                  record_id: string;
                  lat: number | null;
                  lng: number | null;
                  district: string | null;
                  ceid: string | null;
                  verification_status: string;
                }>;
              };
              updates.field_ldn = (json.records ?? [])
                .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
                .map((r) => ({
                  id: `ldn-${r.record_id}`,
                  lat: r.lat as number,
                  lng: r.lng as number,
                  title: `LDN #${r.record_id}${r.ceid ? ` · ${r.ceid}` : ""}`,
                  subtitle: `${r.district ?? "Zimbabwe"} · ${r.verification_status}`,
                  color: "#005a2b",
                  layerLabel: "FIELD-LDN · SO1 Verify",
                }));
            } else if (key === "ref_sites") {
              const res = await fetch("/api/reference/monitoring-sites", { cache: "no-store" });
              if (!res.ok) return;
              const json = (await res.json()) as {
                records?: Array<{
                  id?: number;
                  site_name?: string;
                  district?: string;
                  lat?: number;
                  lng?: number;
                }>;
              };
              updates.ref_sites = (json.records ?? [])
                .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
                .map((r, i) => ({
                  id: `ref-${r.id ?? i}`,
                  lat: r.lat as number,
                  lng: r.lng as number,
                  title: r.site_name ?? `Monitoring Site ${r.id}`,
                  subtitle: `${r.district ?? "Zimbabwe"} · EMA Monitoring Network`,
                  color: "#0891b2",
                  layerLabel: "REF-SITES · Operations QA",
                }));
            } else if (key === "int_projects") {
              const res = await fetch("/api/interventions", { cache: "no-store" });
              if (!res.ok) return;
              const json = (await res.json()) as {
                records?: Array<{
                  _id?: string;
                  id?: string;
                  name?: string;
                  project_name?: string;
                  title?: string;
                  district?: string;
                  lat?: number;
                  lng?: number;
                  latitude?: number;
                  longitude?: number;
                }>;
              };
              updates.int_projects = (json.records ?? [])
                .map((r, i) => ({
                  id: `int-${r._id ?? r.id ?? i}`,
                  lat: Number(r.lat ?? r.latitude),
                  lng: Number(r.lng ?? r.longitude),
                  title: String(r.name ?? r.project_name ?? r.title ?? `Intervention #${i + 1}`),
                  subtitle: `${r.district ?? "Zimbabwe"} · Restoration Bright Spot`,
                  color: "#1d4ed8",
                  layerLabel: "INT-PROJECTS · SO4 Restoration",
                }))
                .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== 0);
            } else if (key === "press_invasive" || key === "press_mining") {
              const theme = key === "press_mining" ? "illegal_mining" : "invasive";
              const res = await fetch(`/api/pressure-layers?theme=${theme}`, { cache: "no-store" });
              if (!res.ok) return;
              const json = (await res.json()) as {
                records?: Array<{
                  _id?: string;
                  lat?: number;
                  lng?: number;
                  layer_id?: string;
                  attributes?: Record<string, unknown>;
                }>;
              };
              updates[key] = (json.records ?? [])
                .slice(0, 350)
                .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
                .map((r, i) => ({
                  id: `${key}-${r._id ?? i}`,
                  lat: r.lat as number,
                  lng: r.lng as number,
                  title: String(
                    r.attributes?.Species ?? r.attributes?.Village ?? r.layer_id ?? theme
                  ),
                  subtitle:
                    key === "press_mining"
                      ? "Illegal Mining / Panning (Restricted)"
                      : "Invasive Species Observation",
                  color: key === "press_mining" ? "#b42318" : "#d97706",
                  layerLabel:
                    key === "press_mining"
                      ? "PRESS-MINING · SO2 Driver"
                      : "PRESS-INVASIVE · SO1-2 Driver",
                }));
            }
          })
        );

        if (!cancelled) {
          setOverlayCache((prev) => ({ ...prev, ...updates }));
        }
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    }

    fetchOverlays();
    return () => {
      cancelled = true;
    };
  }, [activeOverlays, overlayCache]);

  const toggleOverlay = (cfg: OverlayConfig) => {
    if (cfg.restricted && !permissions.canViewRestrictedLayers) return;
    setActiveOverlays((prev) => ({ ...prev, [cfg.key]: !prev[cfg.key] }));
  };

  const combinedPoints = useMemo(() => {
    const out: GovMapPoint[] = [];
    for (const cfg of OVERLAY_CONFIGS) {
      if (activeOverlays[cfg.key] && overlayCache[cfg.key]) {
        out.push(...(overlayCache[cfg.key] ?? []));
      }
    }
    return out;
  }, [activeOverlays, overlayCache]);

  const activeLegend: GovMapLegendItem[] = useMemo(
    () =>
      OVERLAY_CONFIGS.filter((cfg) => activeOverlays[cfg.key]).map((cfg) => ({
        label: cfg.label,
        color: cfg.color,
        count: overlayCache[cfg.key]?.length ?? 0,
      })),
    [activeOverlays, overlayCache]
  );

  const filteredLayers = useMemo(() => {
    const list = data?.layers ?? [];
    const q = searchTerm.trim().toLowerCase();
    return list.filter((row) => {
      if (statusFilter && row.import_status !== statusFilter) return false;
      if (tierFilter && row.data_tier !== tierFilter) return false;
      if (q) {
        const hay = `${row.layer_id} ${row.title} ${row.so_uses.join(" ")} ${row.abstract ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, statusFilter, tierFilter, searchTerm]);

  const filteredFeatures = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return combinedPoints;
    return combinedPoints.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.subtitle ?? "").toLowerCase().includes(q) ||
        (p.layerLabel ?? "").toLowerCase().includes(q)
    );
  }, [combinedPoints, searchTerm]);

  const focusLayerOnMap = (layerId: string) => {
    const match = OVERLAY_CONFIGS.find((c) => c.layerId === layerId);
    if (!match) return;
    if (match.restricted && !permissions.canViewRestrictedLayers) return;
    setActiveOverlays((prev) => ({ ...prev, [match.key]: true }));
    if (viewMode === "table") setViewMode("split");
  };

  const degradedPct = so1Status?.summary?.degraded_area_percent ?? 8.86;
  const liveReadyCount = (data?.layers ?? []).filter((l) =>
    ["etl_complete", "json_loaded", "staging_json", "partial"].includes(l.import_status)
  ).length;
  const awaitingCount = (data?.layers ?? []).filter(
    (l) => l.import_status === "awaiting_delivery"
  ).length;

  return (
    <>
      {/* Page Header */}
      <div className="gov-page-header">
        <div>
          <h1 className="gov-page-title">National Layers & Spatial LDN Hub</h1>
          <p className="gov-page-subtitle">
            Governed national spatial corpus (Annex C & F1 EXP-META) pairing live multi-layer GIS
            overlays with tabular lineage and Zimbabwe’s SDG 15.3.1 counterbalancing posture.
          </p>
        </div>
        <div className="gov-page-actions">
          <div
            style={{
              display: "inline-flex",
              background: "#e9efeb",
              padding: 3,
              borderRadius: 8,
              gap: 3,
            }}
          >
            <button
              type="button"
              className={`gov-btn gov-btn-sm ${viewMode === "split" ? "gov-btn-primary" : ""}`}
              style={{ border: "none" }}
              onClick={() => setViewMode("split")}
            >
              <Columns2 size={13} /> Split
            </button>
            <button
              type="button"
              className={`gov-btn gov-btn-sm ${viewMode === "map" ? "gov-btn-primary" : ""}`}
              style={{ border: "none" }}
              onClick={() => setViewMode("map")}
            >
              <MapIcon size={13} /> Map
            </button>
            <button
              type="button"
              className={`gov-btn gov-btn-sm ${viewMode === "table" ? "gov-btn-primary" : ""}`}
              style={{ border: "none" }}
              onClick={() => setViewMode("table")}
            >
              <Table2 size={13} /> Table
            </button>
          </div>
          <button type="button" className="gov-btn" onClick={loadCore} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <a href="/api/corpus-layers?format=csv" className="gov-btn gov-btn-primary">
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      {/* National LDN Posture & Corpus Readiness Strip */}
      <div className="gov-grid-4">
        <div className="gov-card" style={{ borderLeft: "4px solid #005a2b" }}>
          <div className="gov-metric-label">SDG 15.3.1 Status (Interim)</div>
          <div className="gov-metric-value">{degradedPct.toFixed(2)}%</div>
          <div className="gov-metric-sub">
            Degraded across <strong>254,873</strong> national polygons ·{" "}
            <Link href="/analytics" style={{ color: "#005a2b", fontWeight: 600 }}>
              SO1 Matrix →
            </Link>
          </div>
        </div>

        <div className="gov-card" style={{ borderLeft: "4px solid #1d4ed8" }}>
          <div className="gov-metric-label">Restoration Bright Spots (SO4)</div>
          <div className="gov-metric-value">1,414</div>
          <div className="gov-metric-sub">
            <strong>47</strong> EMA projects + <strong>1,367</strong> SBC conservation points
          </div>
        </div>

        <div className="gov-card" style={{ borderLeft: "4px solid #d97706" }}>
          <div className="gov-metric-label">Degradation Drivers (Pressures)</div>
          <div className="gov-metric-value">2,804</div>
          <div className="gov-metric-sub">
            <strong>2,035</strong> invasive species + <strong>769</strong> mining (restricted)
          </div>
        </div>

        <div className="gov-card" style={{ borderLeft: "4px solid #0891b2" }}>
          <div className="gov-metric-label">Corpus Readiness (F1 Meta)</div>
          <div className="gov-metric-value">
            {liveReadyCount}/{data?.layer_count ?? 13}
          </div>
          <div className="gov-metric-sub">
            Operational/staging · <strong>{awaitingCount}</strong> rasters awaiting S10–S12
          </div>
        </div>
      </div>

      {error && <div className="gov-alert gov-alert-red">{error}</div>}

      {/* Main Spatial + Tabular Workspace */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: viewMode === "split" ? "minmax(0, 1.15fr) minmax(0, 1fr)" : "1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        {/* SPATIAL MAP PANEL */}
        {viewMode !== "table" && (
          <div className="gov-card" style={{ padding: 16 }}>
            <div className="gov-card-header" style={{ marginBottom: 10 }}>
              <div>
                <div className="gov-card-title">
                  <MapPin size={16} color="#005a2b" /> Zimbabwe LDN Spatial Intelligence Map
                </div>
                <div className="gov-metric-sub">
                  Toggle layers to compare degradation drivers, restoration bright spots, and field QA.
                </div>
              </div>
              <span className="gov-badge gov-badge-green">
                {combinedPoints.length.toLocaleString()} plotted
              </span>
            </div>

            {/* Interactive Multi-Layer Toggle Chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                marginBottom: 12,
                padding: "10px 12px",
                background: "#f6f9f7",
                borderRadius: 8,
                border: "1px solid #e1e9e4",
              }}
            >
              {OVERLAY_CONFIGS.map((cfg) => {
                const isOn = activeOverlays[cfg.key];
                const blocked = Boolean(cfg.restricted && !permissions.canViewRestrictedLayers);
                return (
                  <button
                    key={cfg.key}
                    type="button"
                    disabled={blocked}
                    onClick={() => toggleOverlay(cfg)}
                    title={
                      blocked
                        ? `Restricted (${role}): requires National Reporting Officer, GIS Lead, or ICT/DBA`
                        : `${cfg.label} (${cfg.ldnRole})`
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: blocked ? "not-allowed" : "pointer",
                      opacity: blocked ? 0.5 : 1,
                      border: `1px solid ${isOn ? cfg.color : "#cbd7cf"}`,
                      background: isOn ? cfg.color : "#ffffff",
                      color: isOn ? "#ffffff" : "#1d3226",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isOn ? "#ffffff" : cfg.color,
                      }}
                    />
                    <span>{cfg.label}</span>
                    {cfg.restricted && <Lock size={11} />}
                  </button>
                );
              })}
            </div>

            {!permissions.canViewRestrictedLayers && (
              <div className="gov-alert gov-alert-amber" style={{ marginBottom: 10, padding: "8px 12px" }}>
                <Lock size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12 }}>
                  <strong>RBAC ({role}):</strong> Illegal Mining (<code>PRESS-MINING</code>) overlay is
                  restricted to National Reporting Officer & GIS Lead.
                </span>
              </div>
            )}

            <div style={{ position: "relative" }}>
              <GovPointMap
                points={combinedPoints}
                height={viewMode === "map" ? 560 : 470}
                showBasemapSwitcher
                legend={activeLegend}
              />
              {mapLoading && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 52,
                    zIndex: 600,
                    background: "rgba(4,48,22,0.88)",
                    color: "#ffffff",
                    padding: "5px 11px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Loading spatial layer…
                </div>
              )}
            </div>
          </div>
        )}

        {/* TABULAR EXPLORER PANEL */}
        {viewMode !== "map" && (
          <div className="gov-card" style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className={`gov-btn gov-btn-sm ${
                    tableTab === "catalogue" ? "gov-btn-primary" : ""
                  }`}
                  onClick={() => setTableTab("catalogue")}
                >
                  <Layers size={13} /> Layer Register ({filteredLayers.length})
                </button>
                <button
                  type="button"
                  className={`gov-btn gov-btn-sm ${
                    tableTab === "features" ? "gov-btn-primary" : ""
                  }`}
                  onClick={() => setTableTab("features")}
                >
                  <MapPin size={13} /> Plotted Features ({filteredFeatures.length})
                </button>
              </div>

              {data?.validation.pass && (
                <span className="gov-badge gov-badge-green">
                  <ShieldCheck size={12} /> F1 Annex II Valid
                </span>
              )}
            </div>

            {/* Search & Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <div style={{ position: "relative", flex: "1 1 180px" }}>
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
                  style={{ width: "100%", paddingLeft: 29, fontSize: 12 }}
                  placeholder={
                    tableTab === "catalogue"
                      ? "Search layer ID, title, SO use…"
                      : "Search plotted features…"
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {tableTab === "catalogue" && (
                <>
                  <select
                    className="gov-select"
                    style={{ fontSize: 12 }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by import status"
                  >
                    <option value="">All statuses</option>
                    <option value="etl_complete">etl_complete</option>
                    <option value="json_loaded">json_loaded</option>
                    <option value="staging_json">staging_json</option>
                    <option value="partial">partial</option>
                    <option value="plan_only">plan_only</option>
                    <option value="awaiting_delivery">awaiting_delivery</option>
                  </select>

                  <select
                    className="gov-select"
                    style={{ fontSize: 12 }}
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    aria-label="Filter by data tier"
                  >
                    <option value="">All tiers</option>
                    <option value="field_verify">field_verify</option>
                    <option value="tier2_national">tier2_national</option>
                    <option value="tier1_default">tier1_default</option>
                  </select>
                </>
              )}
            </div>

            {/* TAB 1: CORPUS LAYER REGISTER */}
            {tableTab === "catalogue" && (
              <div className="gov-table-wrap" style={{ maxHeight: viewMode === "split" ? 440 : 620, overflowY: "auto" }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Layer</th>
                      <th>Features</th>
                      <th>Status</th>
                      <th>SO Use</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && !data ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#5b7063" }}>
                          Loading corpus manifest…
                        </td>
                      </tr>
                    ) : (
                      filteredLayers.map((layer) => {
                        const mappable = OVERLAY_CONFIGS.some((c) => c.layerId === layer.layer_id);
                        return (
                          <tr key={layer.layer_id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span className="gov-mono" style={{ fontWeight: 700 }}>
                                  {layer.layer_id}
                                </span>
                                {layer.layer_id === "PRESS-MINING" && (
                                  <span className="gov-badge gov-badge-red" style={{ fontSize: 10 }}>
                                    <Lock size={9} /> Restricted
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: "#4f6457", marginTop: 2 }}>
                                {layer.title}
                              </div>
                            </td>
                            <td className="gov-mono">
                              {layer.feature_count != null
                                ? layer.feature_count.toLocaleString()
                                : "—"}
                              <div style={{ fontSize: 10, color: "#5b7063" }}>
                                {layer.geometry_type}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`gov-badge ${
                                  STATUS_CLASS[layer.import_status] ?? "gov-badge-slate"
                                }`}
                              >
                                {layer.import_status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td style={{ fontSize: 12 }}>{layer.so_uses.join(", ")}</td>
                            <td>
                              <div style={{ display: "flex", gap: 5 }}>
                                {mappable && (
                                  <button
                                    type="button"
                                    className="gov-btn gov-btn-sm"
                                    onClick={() => focusLayerOnMap(layer.layer_id)}
                                    title="Plot on map"
                                  >
                                    <MapPin size={12} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="gov-btn gov-btn-sm"
                                  onClick={() => setSelected(layer)}
                                  title="Inspect lineage metadata"
                                >
                                  <Info size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: ACTIVE SPATIAL FEATURES */}
            {tableTab === "features" && (
              <div className="gov-table-wrap" style={{ maxHeight: viewMode === "split" ? 440 : 620, overflowY: "auto" }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Layer</th>
                      <th>Feature</th>
                      <th>Context</th>
                      <th>Coordinates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeatures.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "#5b7063" }}>
                          Toggle a spatial layer on the map to inspect its features.
                        </td>
                      </tr>
                    ) : (
                      filteredFeatures.slice(0, 200).map((pt) => (
                        <tr key={pt.id}>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                color: pt.color,
                              }}
                            >
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: pt.color,
                                }}
                              />
                              {pt.layerLabel?.split(" · ")[0] ?? "Layer"}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{pt.title}</td>
                          <td style={{ fontSize: 12, color: "#4f6457" }}>{pt.subtitle ?? "—"}</td>
                          <td className="gov-mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                            {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* S10-S12 National Raster Callout */}
      <div className="gov-alert gov-alert-amber">
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>National SO1 Raster Layers Pending (S10–S12):</strong>{" "}
          <code>LC-NAT-STACK</code>, <code>LPD-NAT-RASTER</code>, and <code>SOC-NAT-SURFACE</code>{" "}
          are registered in Annex C and ready for ingestion once EMA GIS drops GeoTIFF files.{" "}
          <Link href="/reporting-desk" style={{ color: "#7c4700", fontWeight: 700 }}>
            View §F Gates →
          </Link>
        </span>
      </div>

      {/* Metadata Lineage Drawer */}
      {selected && (
        <div className="gov-drawer-backdrop" onClick={() => setSelected(null)}>
          <div className="gov-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="gov-drawer-header">
              <div>
                <div className="gov-metric-label">Corpus Layer Lineage (Annex C)</div>
                <div className="gov-card-title" style={{ marginTop: 2 }}>
                  <Layers size={16} /> {selected.layer_id}
                </div>
              </div>
              <button type="button" className="gov-btn gov-btn-sm" onClick={() => setSelected(null)}>
                <X size={14} />
              </button>
            </div>

            <div className="gov-drawer-body">
              <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.title}</div>
              {selected.abstract && (
                <div className="gov-metric-sub" style={{ fontSize: 13 }}>
                  {selected.abstract}
                </div>
              )}

              <div className="gov-kv-grid">
                <div>
                  <div className="gov-kv-label">Custodian</div>
                  <div className="gov-kv-val">{selected.custodian}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Import Status</div>
                  <div className="gov-kv-val">
                    <span
                      className={`gov-badge ${
                        STATUS_CLASS[selected.import_status] ?? "gov-badge-slate"
                      }`}
                    >
                      {selected.import_status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="gov-kv-label">Geometry / CRS</div>
                  <div className="gov-kv-val">
                    {selected.geometry_type} · {selected.crs}
                  </div>
                </div>
                <div>
                  <div className="gov-kv-label">Feature Count</div>
                  <div className="gov-kv-val">
                    {selected.feature_count != null
                      ? selected.feature_count.toLocaleString()
                      : "Pending"}
                  </div>
                </div>
                <div>
                  <div className="gov-kv-label">Data Tier</div>
                  <div className="gov-kv-val">{selected.data_tier}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Confidence</div>
                  <div className="gov-kv-val">{selected.confidence}</div>
                </div>
                <div>
                  <div className="gov-kv-label">SO Uses</div>
                  <div className="gov-kv-val">{selected.so_uses.join(", ")}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Vintage</div>
                  <div className="gov-kv-val gov-mono">{selected.vintage}</div>
                </div>
              </div>

              <div>
                <div className="gov-kv-label">Documentation / Plan Path</div>
                <div className="gov-kv-val gov-mono">{selected.doc_path}</div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {OVERLAY_CONFIGS.some((c) => c.layerId === selected.layer_id) && (
                  <button
                    type="button"
                    className="gov-btn gov-btn-primary"
                    onClick={() => {
                      focusLayerOnMap(selected.layer_id);
                      setSelected(null);
                    }}
                  >
                    <MapPin size={14} /> Plot on Spatial Map
                  </button>
                )}
                {selected.layer_id.startsWith("PRESS-") && (
                  <a
                    href={`/api/pressure-layers?theme=${
                      selected.layer_id === "PRESS-MINING" ? "mining" : "invasive"
                    }`}
                    target="_blank"
                    rel="noreferrer"
                    className="gov-btn"
                  >
                    <CheckCircle2 size={14} /> Staging JSON API
                  </a>
                )}
                {selected.layer_id.startsWith("INT-") && (
                  <a href="/api/interventions" target="_blank" rel="noreferrer" className="gov-btn">
                    <CheckCircle2 size={14} /> Interventions JSON API
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
