import { useEffect, useRef, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import {
  AlertTriangle,
  CheckCircle2,
  Footprints,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  computePolygonMetrics,
  isInsideZimbabwe,
  type GeoPoint,
  type SpatialGeometry,
} from "../lib/submission-envelope";

interface GpsPolygonCaptureProps {
  value: SpatialGeometry;
  onChange: (geom: SpatialGeometry) => void;
  allowPolygon?: boolean;
  onAreaCalculated?: (areaHa: number) => void;
}

async function getCurrentPositionSafe(): Promise<GeoPoint> {
  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      altitude: pos.coords.altitude,
      accuracy_m: pos.coords.accuracy,
      captured_at: new Date().toISOString(),
    };
  } catch {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS not available on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) =>
          resolve({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            altitude: p.coords.altitude,
            accuracy_m: p.coords.accuracy,
            captured_at: new Date().toISOString(),
          }),
        (err) => reject(new Error(err.message || "Unable to read GPS.")),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });
  }
}

export default function GpsPolygonCapture({
  value,
  onChange,
  allowPolygon = true,
  onAreaCalculated,
}: GpsPolygonCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walking, setWalking] = useState(false);
  const walkTimerRef = useRef<number | null>(null);

  const coords = value.polygon?.coordinates ?? [];

  const updatePolygon = (nextCoords: Array<[number, number]>, latestPoint?: GeoPoint) => {
    const { area_ha, perimeter_m } = computePolygonMetrics(nextCoords);
    onChange({
      mode: "polygon",
      point: latestPoint ?? value.point ?? (nextCoords[0] ? { lat: nextCoords[0][1], lng: nextCoords[0][0] } : null),
      polygon: {
        coordinates: nextCoords,
        area_ha,
        perimeter_m,
        vertex_count: nextCoords.length,
      },
    });
    if (onAreaCalculated && area_ha > 0) {
      onAreaCalculated(area_ha);
    }
  };

  const capturePoint = async () => {
    setLoading(true);
    setError(null);
    try {
      const pt = await getCurrentPositionSafe();
      onChange({
        mode: "point",
        point: pt,
        polygon: value.polygon ?? null,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "GPS capture failed");
    } finally {
      setLoading(false);
    }
  };

  const addVertex = async () => {
    setLoading(true);
    setError(null);
    try {
      const pt = await getCurrentPositionSafe();
      const next: Array<[number, number]> = [...coords, [pt.lng, pt.lat]];
      updatePolygon(next, pt);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "GPS vertex capture failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!walking) {
      if (walkTimerRef.current) {
        window.clearInterval(walkTimerRef.current);
        walkTimerRef.current = null;
      }
      return;
    }

    // Record first vertex immediately and every 5 seconds while walking
    addVertex();
    walkTimerRef.current = window.setInterval(() => {
      addVertex();
    }, 5000);

    return () => {
      if (walkTimerRef.current) {
        window.clearInterval(walkTimerRef.current);
        walkTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walking]);

  const undoVertex = () => {
    if (coords.length === 0) return;
    updatePolygon(coords.slice(0, -1));
  };

  const clearPolygon = () => {
    setWalking(false);
    updatePolygon([]);
  };

  const pt = value.point;
  const accuracy = pt?.accuracy_m ?? null;
  const outsideZim = pt != null && !isInsideZimbabwe(pt.lat, pt.lng);

  // Build SVG miniature preview of the walked polygon
  const renderPolygonPreview = () => {
    if (coords.length < 2) return null;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const minX = Math.min(...lngs);
    const maxX = Math.max(...lngs);
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);
    const spanX = Math.max(maxX - minX, 0.0001);
    const spanY = Math.max(maxY - minY, 0.0001);

    const pts = coords
      .map(([lng, lat]) => {
        const x = 14 + ((lng - minX) / spanX) * 172;
        const y = 86 - ((lat - minY) / spanY) * 72;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg
        viewBox="0 0 200 100"
        style={{
          width: "100%",
          height: 96,
          background: "rgba(4, 20, 11, 0.85)",
          borderRadius: 8,
          border: "1px solid rgba(76, 175, 80, 0.3)",
          marginTop: 8,
        }}
      >
        {coords.length >= 3 ? (
          <polygon
            points={pts}
            fill="rgba(74, 222, 128, 0.22)"
            stroke="#4ade80"
            strokeWidth="2"
          />
        ) : (
          <polyline points={pts} fill="none" stroke="#4ade80" strokeWidth="2" />
        )}
        {coords.map(([lng, lat], i) => {
          const x = 14 + ((lng - minX) / spanX) * 172;
          const y = 86 - ((lat - minY) / spanY) * 72;
          return <circle key={i} cx={x} cy={y} r="3" fill="#fde68a" />;
        })}
      </svg>
    );
  };

  return (
    <div
      style={{
        background: "rgba(11, 30, 18, 0.72)",
        border: "1px solid rgba(76, 175, 80, 0.28)",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Mode Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fde68a", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {value.mode === "polygon" ? <Footprints size={15} /> : <MapPin size={15} />}
          Spatial Capture
        </span>

        {allowPolygon && (
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.08)", padding: 3, borderRadius: 8, gap: 4 }}>
            <button
              type="button"
              onClick={() => {
                setWalking(false);
                onChange({ ...value, mode: "point" });
              }}
              style={{
                border: "none",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: value.mode === "point" ? "#005a2b" : "transparent",
                color: "#ffffff",
              }}
            >
              Point GPS
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, mode: "polygon" })}
              style={{
                border: "none",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: value.mode === "polygon" ? "#005a2b" : "transparent",
                color: "#ffffff",
              }}
            >
              Walk Polygon (ha)
            </button>
          </div>
        )}
      </div>

      {/* POINT MODE */}
      {value.mode === "point" && (
        <>
          <button
            type="button"
            className="btn-primary"
            onClick={capturePoint}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px" }}
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <MapPin size={15} />}
            {loading ? "Acquiring GPS…" : pt ? "Re-capture GPS Point" : "Capture GPS Point"}
          </button>

          {pt && (
            <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: "monospace", color: "#86efac" }}>
                Lat: {pt.lat.toFixed(6)} · Lng: {pt.lng.toFixed(6)}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {accuracy != null && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background:
                        accuracy <= 10
                          ? "rgba(74,222,128,0.18)"
                          : accuracy <= 15
                            ? "rgba(250,204,21,0.2)"
                            : "rgba(244,63,94,0.22)",
                      color: accuracy <= 10 ? "#86efac" : accuracy <= 15 ? "#fde68a" : "#fda4af",
                    }}
                  >
                    {accuracy <= 10 ? <CheckCircle2 size={11} style={{ verticalAlign: "middle", marginRight: 4 }} /> : <AlertTriangle size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />}
                    Accuracy: ±{accuracy.toFixed(1)} m
                  </span>
                )}
                {outsideZim && (
                  <span style={{ fontSize: 11, color: "#fda4af", fontWeight: 600 }}>
                    Outside Zimbabwe bounds
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* POLYGON WALK MODE */}
      {value.mode === "polygon" && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setWalking((w) => !w)}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                background: walking ? "#b91c1c" : "#005a2b",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {walking ? <Square size={13} /> : <Play size={13} />}
              {walking ? "Stop Walk" : "Auto-Walk (5s)"}
            </button>

            <button
              type="button"
              onClick={addVertex}
              disabled={loading}
              style={{
                border: "1px solid rgba(255,255,255,0.22)",
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                background: "rgba(255,255,255,0.1)",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Plus size={14} /> Add Vertex
            </button>

            <button
              type="button"
              onClick={undoVertex}
              disabled={coords.length === 0}
              title="Undo last vertex"
              style={{
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "9px 10px",
                background: "transparent",
                color: "#ffffff",
                cursor: "pointer",
                opacity: coords.length === 0 ? 0.4 : 1,
              }}
            >
              <Undo2 size={14} />
            </button>

            <button
              type="button"
              onClick={clearPolygon}
              disabled={coords.length === 0}
              title="Clear polygon"
              style={{
                border: "1px solid rgba(244,63,94,0.4)",
                borderRadius: 8,
                padding: "9px 10px",
                background: "transparent",
                color: "#fda4af",
                cursor: "pointer",
                opacity: coords.length === 0 ? 0.4 : 1,
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              fontSize: 11,
              background: "rgba(255,255,255,0.05)",
              padding: "8px 10px",
              borderRadius: 8,
            }}
          >
            <div>
              <div style={{ color: "var(--text-muted)" }}>Vertices</div>
              <strong style={{ fontSize: 14, color: "#ffffff" }}>{coords.length}</strong>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)" }}>Calculated Area</div>
              <strong style={{ fontSize: 14, color: "#86efac" }}>
                {(value.polygon?.area_ha ?? 0).toFixed(3)} ha
              </strong>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)" }}>Perimeter</div>
              <strong style={{ fontSize: 14, color: "#fde68a" }}>
                {(value.polygon?.perimeter_m ?? 0).toFixed(0)} m
              </strong>
            </div>
          </div>

          {renderPolygonPreview()}
        </>
      )}

      {error && (
        <div style={{ fontSize: 12, color: "#fda4af", fontWeight: 600 }}>{error}</div>
      )}
    </div>
  );
}
