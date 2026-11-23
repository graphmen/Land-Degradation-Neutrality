"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
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
import type {
  GovBoundaryOverlay,
  GovMapLegendItem,
  GovMapPoint,
} from "@/components/GovPointMap";
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

type BoundaryKey = "provinces" | "districts" | "wards";

const BOUNDARY_CONFIGS: Array<{
  key: BoundaryKey;
  label: string;
  url: string;
  color: string;
  weight: number;
  dashArray?: string;
  count: number;
}> = [
  {
    key: "provinces",
    label: "Provinces (10)",
    url: "/boundaries/zwe-provinces.geojson",
    color: "#facc15",
    weight: 2.5,
    count: 10,
  },
  {
    key: "districts",
    label: "Districts (91)",
    url: "/boundaries/zwe-districts.geojson",
    color: "#38bdf8",
    weight: 1.5,
    dashArray: "4 3",
    count: 91,
  },
  {
    key: "wards",
    label: "Wards (1,961)",
    url: "/boundaries/zwe-wards.geojson",
    color: "#f8fafc",
    weight: 0.9,
    count: 1961,
  },
];

type ViewMode = "map" | "table";
type TableTab = "catalogue" | "features";

export default function NationalLayersPage() {
  const { role, permissions } = useGovPlatform();
  const [data, setData] = useState<CorpusLayersPayload | null>(null);
  const [so1Status, setSo1Status] = useState<So1StatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [tableTab, setTableTab] = useState<TableTab>("catalogue");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<CorpusLayerRow | null>(null);

  // Export Filter Modal state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"register" | "plotted" | "custom">("plotted");
  const [exportFormat, setExportFormat] = useState<"csv" | "geojson">("csv");
  const [exportLayers, setExportLayers] = useState<Record<OverlayKey, boolean>>({
    field_ldn: true,
    ref_sites: true,
    int_projects: true,
    press_invasive: false,
    press_mining: false,
  });
  const [exporting, setExporting] = useState(false);

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

  // Zimbabwe Admin Boundary Overlays (Provinces / Districts / Wards)
  const [activeBoundaries, setActiveBoundaries] = useState<Record<BoundaryKey, boolean>>({
    provinces: true,
    districts: false,
    wards: false,
  });
  const [boundaryCache, setBoundaryCache] = useState<
    Partial<Record<BoundaryKey, GeoJSON.GeoJsonObject>>
  >({});

  useEffect(() => {
    const missing = BOUNDARY_CONFIGS.filter(
      (b) => activeBoundaries[b.key] && !boundaryCache[b.key]
    );
    if (missing.length === 0) return;

    let cancelled = false;
    async function loadBoundaries() {
      setMapLoading(true);
      try {
        const updates: Partial<Record<BoundaryKey, GeoJSON.GeoJsonObject>> = {};
        await Promise.all(
          missing.map(async (b) => {
            const res = await fetch(b.url);
            if (!res.ok) return;
            updates[b.key] = (await res.json()) as GeoJSON.GeoJsonObject;
          })
        );
        if (!cancelled) {
          setBoundaryCache((prev) => ({ ...prev, ...updates }));
        }
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    }

    loadBoundaries();
    return () => {
      cancelled = true;
    };
  }, [activeBoundaries, boundaryCache]);

  const activeBoundaryOverlays: GovBoundaryOverlay[] = useMemo(
    () =>
      BOUNDARY_CONFIGS.filter((b) => activeBoundaries[b.key] && boundaryCache[b.key]).map((b) => ({
        id: b.key,
        label: b.label,
        geojson: boundaryCache[b.key]!,
        color: b.color,
        weight: b.weight,
        dashArray: b.dashArray,
        fillOpacity: b.key === "provinces" ? 0.04 : 0.02,
      })),
    [activeBoundaries, boundaryCache]
  );

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
    () => [
      ...BOUNDARY_CONFIGS.filter((b) => activeBoundaries[b.key]).map((b) => ({
        label: b.label.replace(/\s*\(.+\)/, ""),
        color: b.color,
        count: b.count,
        isLine: true,
      })),
      ...OVERLAY_CONFIGS.filter((cfg) => activeOverlays[cfg.key]).map((cfg) => ({
        label: cfg.label,
        color: cfg.color,
        count: overlayCache[cfg.key]?.length ?? 0,
      })),
    ],
    [activeBoundaries, activeOverlays, overlayCache]
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
    setViewMode("map");
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const csvCell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleFilteredExport = async () => {
    setExporting(true);
    try {
      const dateTag = new Date().toISOString().slice(0, 10);

      if (exportScope === "register") {
        if (exportFormat === "geojson") {
          triggerDownload(
            JSON.stringify({ layers: filteredLayers }, null, 2),
            `ema-ldn-layer-register-${dateTag}.json`,
            "application/json"
          );
        } else {
          const headers = [
            "layer_id",
            "title",
            "custodian",
            "geometry_type",
            "feature_count",
            "vintage",
            "crs",
            "data_tier",
            "confidence",
            "import_status",
            "so_uses",
          ];
          const lines = [
            headers.join(","),
            ...filteredLayers.map((r) =>
              [
                r.layer_id,
                r.title,
                r.custodian,
                r.geometry_type,
                r.feature_count ?? "",
                r.vintage,
                r.crs,
                r.data_tier,
                r.confidence,
                r.import_status,
                r.so_uses.join(";"),
              ]
                .map(csvCell)
                .join(",")
            ),
          ];
          triggerDownload(
            lines.join("\n"),
            `ema-ldn-layer-register-${dateTag}.csv`,
            "text/csv;charset=utf-8"
          );
        }
        setExportOpen(false);
        return;
      }

      // Spatial features export ("plotted" or "custom")
      const chosenKeys: OverlayKey[] =
        exportScope === "plotted"
          ? (Object.keys(activeOverlays) as OverlayKey[]).filter((k) => activeOverlays[k])
          : (Object.keys(exportLayers) as OverlayKey[]).filter(
              (k) =>
                exportLayers[k] &&
                !(k === "press_mining" && !permissions.canViewRestrictedLayers)
            );

      // Fetch any uncached selected layers on demand
      const pointsToExport: GovMapPoint[] = [];
      for (const key of chosenKeys) {
        if (overlayCache[key]) {
          pointsToExport.push(...(overlayCache[key] ?? []));
          continue;
        }
        if (key === "field_ldn") {
          const res = await fetch("/api/evidence/registry?type=ldn&limit=500", { cache: "no-store" });
          const json = res.ok ? await res.json() : {};
          for (const r of json.records ?? []) {
            if (typeof r.lat === "number" && typeof r.lng === "number") {
              pointsToExport.push({
                id: `ldn-${r.record_id}`,
                lat: r.lat,
                lng: r.lng,
                title: `LDN #${r.record_id}${r.ceid ? ` · ${r.ceid}` : ""}`,
                subtitle: `${r.district ?? "Zimbabwe"} · ${r.verification_status}`,
                layerLabel: "FIELD-LDN",
              });
            }
          }
        } else if (key === "ref_sites") {
          const res = await fetch("/api/reference/monitoring-sites", { cache: "no-store" });
          const json = res.ok ? await res.json() : {};
          for (const r of json.records ?? []) {
            if (typeof r.lat === "number" && typeof r.lng === "number") {
              pointsToExport.push({
                id: `ref-${r.id}`,
                lat: r.lat,
                lng: r.lng,
                title: r.site_name ?? `Site ${r.id}`,
                subtitle: r.district ?? "Zimbabwe",
                layerLabel: "REF-SITES",
              });
            }
          }
        } else if (key === "int_projects") {
          const res = await fetch("/api/interventions", { cache: "no-store" });
          const json = res.ok ? await res.json() : {};
          for (const r of json.records ?? []) {
            const lat = Number(r.lat ?? r.latitude);
            const lng = Number(r.lng ?? r.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) {
              pointsToExport.push({
                id: `int-${r._id ?? r.id}`,
                lat,
                lng,
                title: String(r.name ?? r.project_name ?? r.title ?? "Intervention"),
                subtitle: String(r.district ?? "Zimbabwe"),
                layerLabel: "INT-PROJECTS",
              });
            }
          }
        } else if (key === "press_invasive" || key === "press_mining") {
          const theme = key === "press_mining" ? "illegal_mining" : "invasive";
          const res = await fetch(`/api/pressure-layers?theme=${theme}`, { cache: "no-store" });
          const json = res.ok ? await res.json() : {};
          for (const r of json.records ?? []) {
            if (typeof r.lat === "number" && typeof r.lng === "number") {
              pointsToExport.push({
                id: `${key}-${r._id}`,
                lat: r.lat,
                lng: r.lng,
                title: String(r.attributes?.Species ?? r.attributes?.Village ?? r.layer_id ?? theme),
                subtitle: key === "press_mining" ? "Illegal Mining" : "Invasive Species",
                layerLabel: key === "press_mining" ? "PRESS-MINING" : "PRESS-INVASIVE",
              });
            }
          }
        }
      }

      if (exportFormat === "geojson") {
        const fc = {
          type: "FeatureCollection",
          exported_at: new Date().toISOString(),
          feature_count: pointsToExport.length,
          features: pointsToExport.map((p) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
            properties: {
              id: p.id,
              layer: p.layerLabel ?? "",
              title: p.title,
              context: p.subtitle ?? "",
            },
          })),
        };
        triggerDownload(
          JSON.stringify(fc, null, 2),
          `ema-ldn-spatial-${dateTag}.geojson`,
          "application/geo+json"
        );
      } else {
        const lines = [
          "id,layer,title,context,lat,lng",
          ...pointsToExport.map((p) =>
            [p.id, p.layerLabel ?? "", p.title, p.subtitle ?? "", p.lat, p.lng]
              .map(csvCell)
              .join(",")
          ),
        ];
        triggerDownload(
          lines.join("\n"),
          `ema-ldn-spatial-${dateTag}.csv`,
          "text/csv;charset=utf-8"
        );
      }
      setExportOpen(false);
    } finally {
      setExporting(false);
    }
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
      <div className="gov-page-header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="gov-page-title">National Layers</h1>
        </div>
        <div className="gov-page-actions">
          <button
            type="button"
            className="gov-btn gov-btn-primary"
            onClick={() => setViewMode((v) => (v === "map" ? "table" : "map"))}
          >
            {viewMode === "map" ? (
              <>
                <Table2 size={15} /> Switch to Tabular View
              </>
            ) : (
              <>
                <MapIcon size={15} /> Switch to Spatial Map
              </>
            )}
          </button>
          <button type="button" className="gov-btn" onClick={loadCore} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="gov-btn" onClick={() => setExportOpen(true)}>
            <Download size={14} /> Export Data…
          </button>
        </div>
      </div>

      {/* Compact Single-Line LDN Posture Ribbon */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px 16px",
          padding: "8px 14px",
          background: "#ffffff",
          border: "1px solid #d9e2dc",
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 18px" }}>
          <span>
            <strong style={{ color: "#005a2b" }}>SDG 15.3.1:</strong>{" "}
            <strong>{degradedPct.toFixed(2)}%</strong> degraded (interim)
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong style={{ color: "#1d4ed8" }}>Bright Spots:</strong> <strong>1,414</strong> (47
            projects · 1,367 SBC)
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong style={{ color: "#d97706" }}>Pressures:</strong> <strong>2,804</strong> (2,035
            invasive · 769 mining)
          </span>
          <span style={{ color: "#cbd7cf" }}>|</span>
          <span>
            <strong style={{ color: "#0891b2" }}>Corpus:</strong>{" "}
            <strong>
              {liveReadyCount}/{data?.layer_count ?? 13}
            </strong>{" "}
            live · {awaitingCount} awaiting S10–S12
          </span>
        </div>
        <Link href="/analytics" style={{ color: "#005a2b", fontWeight: 700, textDecoration: "none" }}>
          SO1 Matrix →
        </Link>
      </div>

      {error && <div className="gov-alert gov-alert-red">{error}</div>}

      {/* Full-Width Spatial OR Tabular Workspace */}
      <div>
        {/* SPATIAL MAP PANEL (Full Width) */}
        {viewMode === "map" && (
          <div className="gov-card" style={{ padding: 16 }}>
            <div className="gov-card-header" style={{ marginBottom: 10 }}>
              <div className="gov-card-title">
                <MapPin size={16} color="#005a2b" /> Zimbabwe LDN Spatial Map
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="gov-badge gov-badge-green">
                  {combinedPoints.length.toLocaleString()} plotted
                </span>
                <button
                  type="button"
                  className="gov-btn gov-btn-sm"
                  onClick={() => setViewMode("table")}
                >
                  <Table2 size={13} /> Open Table View
                </button>
              </div>
            </div>

            {/* Interactive Multi-Layer & Admin Boundary Toggle Chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 7,
                marginBottom: 12,
                padding: "10px 12px",
                background: "#f6f9f7",
                borderRadius: 8,
                border: "1px solid #e1e9e4",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: "#4f6457",
                  marginRight: 2,
                }}
              >
                Boundaries:
              </span>
              {BOUNDARY_CONFIGS.map((b) => {
                const isOn = activeBoundaries[b.key];
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() =>
                      setActiveBoundaries((prev) => ({ ...prev, [b.key]: !prev[b.key] }))
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `1px solid ${isOn ? "#043016" : "#cbd7cf"}`,
                      background: isOn ? "#043016" : "#ffffff",
                      color: isOn ? "#ffffff" : "#1d3226",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: 11,
                        height: 3,
                        borderRadius: 2,
                        background: b.color,
                        border: "0.5px solid rgba(0,0,0,0.25)",
                      }}
                    />
                    <span>{b.label}</span>
                  </button>
                );
              })}

              <span
                style={{
                  width: 1,
                  height: 20,
                  background: "#cbd7cf",
                  margin: "0 4px",
                }}
              />

              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: "#4f6457",
                  marginRight: 2,
                }}
              >
                LDN Layers:
              </span>
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
                boundaries={activeBoundaryOverlays}
                height={620}
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

        {/* TABULAR EXPLORER PANEL (Full Width) */}
        {viewMode === "table" && (
          <div className="gov-card" style={{ padding: 18 }}>
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

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {data?.validation.pass && (
                  <span className="gov-badge gov-badge-green">
                    <ShieldCheck size={12} /> F1 Annex II Valid
                  </span>
                )}
                <button
                  type="button"
                  className="gov-btn gov-btn-sm gov-btn-primary"
                  onClick={() => setViewMode("map")}
                >
                  <MapIcon size={13} /> Back to Spatial Map
                </button>
              </div>
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
              <div className="gov-table-wrap">
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
              <div className="gov-table-wrap">
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

      {/* Export Filter Modal */}
      {exportOpen && (
        <div className="gov-drawer-backdrop" onClick={() => setExportOpen(false)}>
          <div
            className="gov-drawer"
            style={{ width: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gov-drawer-header">
              <div>
                <div className="gov-metric-label">Filtered Data Export</div>
                <div className="gov-card-title" style={{ marginTop: 2 }}>
                  <Download size={16} /> Choose What to Export
                </div>
              </div>
              <button
                type="button"
                className="gov-btn gov-btn-sm"
                onClick={() => setExportOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="gov-drawer-body">
              <div>
                <div className="gov-kv-label" style={{ marginBottom: 8 }}>
                  1. Export Scope
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label
                    className="gov-card"
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      borderColor: exportScope === "plotted" ? "#005a2b" : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === "plotted"}
                      onChange={() => setExportScope("plotted")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        Active Map Layers ({combinedPoints.length.toLocaleString()} features)
                      </div>
                      <div style={{ fontSize: 11, color: "#556b5e" }}>
                        Exports exactly what is currently toggled ON on the map.
                      </div>
                    </div>
                  </label>

                  <label
                    className="gov-card"
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      borderColor: exportScope === "custom" ? "#005a2b" : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === "custom"}
                      onChange={() => setExportScope("custom")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Select Specific Layers</div>
                      <div style={{ fontSize: 11, color: "#556b5e" }}>
                        Pick individual spatial layers below.
                      </div>
                    </div>
                  </label>

                  <label
                    className="gov-card"
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      borderColor: exportScope === "register" ? "#005a2b" : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === "register"}
                      onChange={() => setExportScope("register")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        Corpus Layer Register ({filteredLayers.length} layers)
                      </div>
                      <div style={{ fontSize: 11, color: "#556b5e" }}>
                        Annex C / F1 metadata catalogue (respects active status & tier filters).
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {exportScope === "custom" && (
                <div>
                  <div className="gov-kv-label" style={{ marginBottom: 8 }}>
                    Select Spatial Layers
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {OVERLAY_CONFIGS.map((cfg) => {
                      const blocked = Boolean(
                        cfg.restricted && !permissions.canViewRestrictedLayers
                      );
                      return (
                        <label
                          key={cfg.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "7px 10px",
                            border: "1px solid #d9e2dc",
                            borderRadius: 7,
                            fontSize: 13,
                            opacity: blocked ? 0.5 : 1,
                            cursor: blocked ? "not-allowed" : "pointer",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="checkbox"
                              disabled={blocked}
                              checked={!blocked && exportLayers[cfg.key]}
                              onChange={(e) =>
                                setExportLayers((prev) => ({
                                  ...prev,
                                  [cfg.key]: e.target.checked,
                                }))
                              }
                            />
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: cfg.color,
                              }}
                            />
                            <strong>{cfg.label}</strong>
                          </span>
                          {cfg.restricted && (
                            <span className="gov-badge gov-badge-red" style={{ fontSize: 10 }}>
                              <Lock size={9} /> Restricted
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="gov-kv-label" style={{ marginBottom: 8 }}>
                  2. File Format
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={`gov-btn ${exportFormat === "csv" ? "gov-btn-primary" : ""}`}
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => setExportFormat("csv")}
                  >
                    CSV (Excel / PRAIS)
                  </button>
                  <button
                    type="button"
                    className={`gov-btn ${exportFormat === "geojson" ? "gov-btn-primary" : ""}`}
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => setExportFormat("geojson")}
                  >
                    {exportScope === "register" ? "JSON" : "GeoJSON (QGIS / GIS)"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="gov-btn gov-btn-primary"
                style={{ justifyContent: "center", padding: "11px 16px" }}
                disabled={exporting}
                onClick={handleFilteredExport}
              >
                <Download size={15} />
                {exporting ? "Preparing download…" : "Download Filtered Export"}
              </button>
            </div>
          </div>
        </div>
      )}

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
