"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  CheckCircle2,
  Download,
  Info,
  Layers,
  Lock,
  MapPin,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import type { CorpusLayerRow } from "@/lib/corpus-manifest";
import type { GovMapPoint } from "@/components/GovPointMap";
import { useGovPlatform } from "@/components/GovPlatformContext";

const GovPointMap = dynamic(() => import("@/components/GovPointMap"), { ssr: false });

type CorpusLayersPayload = {
  package_id: string;
  layer_count: number;
  generated_at: string;
  layers: CorpusLayerRow[];
  validation: { pass: boolean; missing: string[] };
};

const STATUS_CLASS: Record<string, string> = {
  etl_complete: "gov-badge-green",
  json_loaded: "gov-badge-green",
  staging_json: "gov-badge-blue",
  partial: "gov-badge-blue",
  plan_only: "gov-badge-amber",
  awaiting_delivery: "gov-badge-red",
  not_started: "gov-badge-slate",
};

export default function NationalLayersPage() {
  const { role, permissions } = useGovPlatform();
  const [data, setData] = useState<CorpusLayersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<CorpusLayerRow | null>(null);

  const [showMap, setShowMap] = useState(false);
  const [mapTheme, setMapTheme] = useState<"ref_sites" | "invasive" | "illegal_mining">("ref_sites");
  const [mapPoints, setMapPoints] = useState<GovMapPoint[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  const loadStagingMap = async (theme: "ref_sites" | "invasive" | "illegal_mining") => {
    setMapLoading(true);
    try {
      if (theme === "ref_sites") {
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
        setMapPoints(
          (json.records ?? [])
            .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
            .map((r, i) => ({
              id: String(r.id ?? i),
              lat: r.lat as number,
              lng: r.lng as number,
              title: r.site_name ?? `Site ${r.id}`,
              subtitle: `REF-SITES · ${r.district ?? "Zimbabwe"}`,
              color: "#146c38",
            }))
        );
        return;
      }

      if (theme === "illegal_mining" && !permissions.canViewRestrictedLayers) {
        setMapPoints([]);
        return;
      }

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
      const recs = (json.records ?? []).slice(0, 400);
      setMapPoints(
        recs
          .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
          .map((r, i) => ({
            id: String(r._id ?? i),
            lat: r.lat as number,
            lng: r.lng as number,
            title: String(
              r.attributes?.Species ?? r.attributes?.Village ?? r.layer_id ?? theme
            ),
            subtitle: `${r.layer_id ?? theme} (staging)`,
            color: theme === "illegal_mining" ? "#b42318" : "#d97706",
          }))
      );
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    if (showMap) {
      loadStagingMap(mapTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap, mapTheme, permissions.canViewRestrictedLayers]);

  const loadLayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/corpus-layers", { cache: "no-store" });
      if (!res.ok) throw new Error(`Corpus layers API returned ${res.status}`);
      setData((await res.json()) as CorpusLayersPayload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load national layers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLayers();
  }, []);

  const filtered = useMemo(() => {
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

  return (
    <>
      <div className="gov-page-header">
        <div>
          <h1 className="gov-page-title">National Layers Catalogue</h1>
          <p className="gov-page-subtitle">
            Governed national spatial and field data corpus (Annex C & F1 EXP-META). Catalogue and
            lineage first; restricted pressure layers are role-gated.
          </p>
        </div>
        <div className="gov-page-actions">
          <button
            type="button"
            className="gov-btn"
            onClick={() => setShowMap((v) => !v)}
          >
            <MapPin size={14} /> {showMap ? "Hide Staging Map" : "Staging Map Preview"}
          </button>
          <button type="button" className="gov-btn" onClick={loadLayers} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <a href="/api/corpus-layers?format=csv" className="gov-btn gov-btn-primary">
            <Download size={14} /> Export Register CSV
          </a>
        </div>
      </div>

      {data && (
        <div className="gov-alert gov-alert-green">
          <CheckCircle2 size={16} />
          <span>
            <strong>{data.layer_count} registered layers</strong> · F1 Metadata Validation:{" "}
            <strong>{data.validation.pass ? "PASS" : "MISSING FIELDS"}</strong> · Last refreshed{" "}
            {new Date(data.generated_at).toLocaleString()}
          </span>
        </div>
      )}

      {error && <div className="gov-alert gov-alert-red">{error}</div>}

      {/* Secondary Staging Map Panel (R1 National Layers §3) */}
      {showMap && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title">
              <MapPin size={16} /> Governed Spatial Layer Preview
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`gov-btn gov-btn-sm ${
                  mapTheme === "ref_sites" ? "gov-btn-primary" : ""
                }`}
                onClick={() => setMapTheme("ref_sites")}
              >
                REF-SITES (28)
              </button>
              <button
                type="button"
                className={`gov-btn gov-btn-sm ${
                  mapTheme === "invasive" ? "gov-btn-primary" : ""
                }`}
                onClick={() => setMapTheme("invasive")}
              >
                PRESS-INVASIVE
              </button>
              <button
                type="button"
                className={`gov-btn gov-btn-sm ${
                  mapTheme === "illegal_mining" ? "gov-btn-danger" : ""
                }`}
                onClick={() => setMapTheme("illegal_mining")}
                disabled={!permissions.canViewRestrictedLayers}
                title={
                  permissions.canViewRestrictedLayers
                    ? "View restricted illegal mining layer"
                    : "Restricted to National Reporting Officer & GIS Lead"
                }
              >
                <Lock size={12} /> PRESS-MINING (Restricted)
              </button>
            </div>
          </div>
          {mapTheme === "illegal_mining" && !permissions.canViewRestrictedLayers ? (
            <div className="gov-alert gov-alert-red">
              <Lock size={16} />
              <span>
                <strong>RBAC Restricted ({role}):</strong> PRESS-MINING is restricted to National
                Reporting Officer, GIS Lead, and ICT/DBA roles per R1 §5.
              </span>
            </div>
          ) : mapLoading ? (
            <div className="gov-metric-sub">Loading coordinates…</div>
          ) : (
            <GovPointMap points={mapPoints} height={360} />
          )}
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
            placeholder="Search by layer_id, title, or SO use…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="gov-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by import status"
        >
          <option value="">All import statuses</option>
          <option value="etl_complete">etl_complete</option>
          <option value="json_loaded">json_loaded</option>
          <option value="staging_json">staging_json</option>
          <option value="partial">partial</option>
          <option value="plan_only">plan_only</option>
          <option value="awaiting_delivery">awaiting_delivery</option>
          <option value="not_started">not_started</option>
        </select>

        <select
          className="gov-select"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          aria-label="Filter by data tier"
        >
          <option value="">All tiers</option>
          <option value="field_verify">field_verify</option>
          <option value="tier2_national">tier2_national</option>
          <option value="tier1_default">tier1_default</option>
        </select>
      </div>

      {/* Catalogue Table */}
      <div className="gov-table-wrap">
        <table className="gov-table">
          <thead>
            <tr>
              <th>Layer ID</th>
              <th>Title</th>
              <th>Geometry</th>
              <th>Features</th>
              <th>Vintage</th>
              <th>Tier</th>
              <th>Import Status</th>
              <th>SO Uses</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 28, color: "#5b7063" }}>
                  Loading corpus manifest…
                </td>
              </tr>
            ) : (
              filtered.map((layer) => (
                <tr key={layer.layer_id}>
                  <td className="gov-mono" style={{ fontWeight: 700 }}>
                    {layer.layer_id}
                    {layer.layer_id === "PRESS-MINING" && (
                      <span
                        className="gov-badge gov-badge-red"
                        style={{ marginLeft: 6 }}
                        title="Restricted to National + GIS roles"
                      >
                        <Lock size={10} /> Restricted
                      </span>
                    )}
                  </td>
                  <td>{layer.title}</td>
                  <td>{layer.geometry_type}</td>
                  <td>
                    {layer.feature_count != null ? layer.feature_count.toLocaleString() : "—"}
                  </td>
                  <td className="gov-mono">{layer.vintage}</td>
                  <td>{layer.data_tier}</td>
                  <td>
                    <span
                      className={`gov-badge ${
                        STATUS_CLASS[layer.import_status] ?? "gov-badge-slate"
                      }`}
                    >
                      {layer.import_status}
                    </span>
                  </td>
                  <td>{layer.so_uses.join(", ")}</td>
                  <td>
                    <button
                      type="button"
                      className="gov-btn gov-btn-sm"
                      onClick={() => setSelected(layer)}
                    >
                      <Info size={12} /> Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Metadata Drawer */}
      {selected && (
        <div className="gov-drawer-backdrop" onClick={() => setSelected(null)}>
          <div className="gov-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="gov-drawer-header">
              <div>
                <div className="gov-metric-label">Corpus Layer Lineage</div>
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
                    {selected.feature_count != null ? selected.feature_count.toLocaleString() : "Pending"}
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

              {selected.layer_id.startsWith("PRESS-") && (
                <a
                  href={`/api/pressure-layers?theme=${
                    selected.layer_id === "PRESS-MINING" ? "mining" : "invasive"
                  }&limit=50`}
                  target="_blank"
                  rel="noreferrer"
                  className="gov-btn"
                >
                  Inspect Staging API (JSON)
                </a>
              )}
              {selected.layer_id.startsWith("INT-") && (
                <a href="/api/interventions" target="_blank" rel="noreferrer" className="gov-btn">
                  Inspect Interventions API (JSON)
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
