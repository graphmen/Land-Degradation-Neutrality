import { useEffect, useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { AlertTriangle, Camera as CameraIcon, Lock, Save } from "lucide-react";
import GpsPolygonCapture from "./GpsPolygonCapture";
import {
  ZIMBABWE_PROVINCE_DISTRICTS,
  loadEnumeratorProfile,
} from "../lib/enumerator-profile";
import { saveModularSubmission } from "../lib/modular-db";
import {
  generateUuid,
  type PhotoAttachment,
  type SpatialGeometry,
  type UniversalSubmission,
} from "../lib/submission-envelope";

interface PressureFormProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onSaved: () => void;
}

const PRESSURE_THEMES = [
  { id: "invasive", label: "Invasive Alien Species", restricted: false },
  { id: "illegal_mining", label: "Illegal Mining / Panning", restricted: true },
  { id: "gully_erosion", label: "Gully / Sheet Erosion", restricted: false },
  { id: "deforestation", label: "Deforestation / Tree Clearing", restricted: false },
  { id: "veld_fire", label: "Veld Fire Scar", restricted: false },
] as const;

export default function PressureForm({ onSuccess, onError, onSaved }: PressureFormProps) {
  const [theme, setTheme] = useState<string>("invasive");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [siteName, setSiteName] = useState("");
  const [enumerator, setEnumerator] = useState("");
  const [team, setTeam] = useState("");

  const [speciesOrActivity, setSpeciesOrActivity] = useState("");
  const [severity, setSeverity] = useState("moderate");
  const [affectedHa, setAffectedHa] = useState("");
  const [clearedHa, setClearedHa] = useState("");
  const [enforcementStatus, setEnforcementStatus] = useState("reported");
  const [notes, setNotes] = useState("");

  const [geometry, setGeometry] = useState<SpatialGeometry>({
    mode: "point",
    point: null,
    polygon: null,
  });
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEnumeratorProfile().then((p) => {
      if (p.province) setProvince(p.province);
      if (p.district) setDistrict(p.district);
      if (p.ward) setWard(p.ward);
      if (p.enumeratorName) setEnumerator(p.enumeratorName);
      if (p.team) setTeam(p.team);
    });
  }, []);

  const capturePhoto = async () => {
    try {
      const img = await Camera.getPhoto({
        quality: 72,
        width: 1280,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });
      if (img.base64String) {
        setPhotos((prev) => [
          ...prev,
          {
            id: generateUuid(),
            caption: `${theme} site photo #${prev.length + 1}`,
            mime: `image/${img.format || "jpeg"}`,
            data_b64: img.base64String!,
            captured_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Photo capture cancelled.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!district) {
      onError("Please select a Province and District.");
      return;
    }
    if (!geometry.point && (geometry.polygon?.vertex_count ?? 0) < 3) {
      onError("Please capture a GPS point or walk a polygon (minimum 3 vertices).");
      return;
    }

    setSaving(true);
    try {
      const isRestricted = theme === "illegal_mining";
      const now = new Date().toISOString();
      const sub: UniversalSubmission = {
        submission_id: generateUuid(),
        module_id: "pressures",
        form_version: "1.0.0",
        reporting_period: "2020-2023",
        enumerator: { name: enumerator || "Field Officer", team: team || "EMA" },
        location: { province, district, ward, site_name: siteName || undefined },
        geometry,
        photos,
        payload: {
          pressure_theme: theme,
          species_or_activity: speciesOrActivity,
          severity,
          affected_area_ha: affectedHa ? Number(affectedHa) : geometry.polygon?.area_ha ?? null,
          cleared_area_ha: clearedHa ? Number(clearedHa) : null,
          enforcement_status: enforcementStatus,
          notes,
        },
        governance: {
          data_tier: "field_verify",
          verification_status: "submitted",
          code_list_version: "1.0",
          sensitivity: isRestricted ? "restricted" : "standard",
        },
        sync_state: "pending",
        created_at: now,
        updated_at: now,
      };

      await saveModularSubmission(sub);
      onSuccess("Degradation pressure saved to offline queue.");
      onSaved();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to save pressure record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mobile-card"
      style={{ maxWidth: 620, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 13 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={18} color="#f59e0b" /> Degradation Pressure Report
        </h2>
        {theme === "illegal_mining" && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
              background: "rgba(244,63,94,0.2)",
              color: "#fda4af",
            }}
          >
            <Lock size={10} /> Restricted
          </span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Pressure Category</label>
        <select className="form-input" value={theme} onChange={(e) => setTheme(e.target.value)}>
          {PRESSURE_THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
              {t.restricted ? " (Restricted)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Province</label>
          <select
            className="form-input"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setDistrict("");
            }}
            required
          >
            <option value="">Select…</option>
            {Object.keys(ZIMBABWE_PROVINCE_DISTRICTS).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">District</label>
          <select
            className="form-input"
            value={district}
            disabled={!province}
            onChange={(e) => setDistrict(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {(ZIMBABWE_PROVINCE_DISTRICTS[province] ?? []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Ward</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Ward 12"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Village / Site Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="Local site name"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
        </div>
      </div>

      <GpsPolygonCapture
        value={geometry}
        onChange={setGeometry}
        allowPolygon
        onAreaCalculated={(ha) => setAffectedHa(String(ha))}
      />

      <div className="form-group">
        <label className="form-label">
          {theme === "invasive"
            ? "Invasive Species Name"
            : theme === "illegal_mining"
              ? "Mineral / Mining Activity"
              : "Primary Driver / Observation"}
        </label>
        <input
          type="text"
          className="form-input"
          placeholder={
            theme === "invasive"
              ? "e.g. Lantana camara, Opuntia"
              : theme === "illegal_mining"
                ? "e.g. Alluvial gold panning along river"
                : "Describe degradation driver…"
          }
          value={speciesOrActivity}
          onChange={(e) => setSpeciesOrActivity(e.target.value)}
          required
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div className="form-group">
          <label className="form-label">Severity</label>
          <select className="form-input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Affected (ha)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            placeholder="Auto from walk"
            value={affectedHa}
            onChange={(e) => setAffectedHa(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            {theme === "invasive" ? "Cleared (ha)" : "Action Status"}
          </label>
          {theme === "invasive" ? (
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0"
              value={clearedHa}
              onChange={(e) => setClearedHa(e.target.value)}
            />
          ) : (
            <select
              className="form-input"
              value={enforcementStatus}
              onChange={(e) => setEnforcementStatus(e.target.value)}
            >
              <option value="reported">Reported</option>
              <option value="order_issued">EMA Order Issued</option>
              <option value="rehabilitating">Under Rehab</option>
            </select>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Field Notes</label>
        <textarea
          className="form-input"
          rows={2}
          placeholder="Additional observations or catchment impact…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          type="button"
          onClick={capturePhoto}
          style={{
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 8,
            padding: "9px 14px",
            background: "rgba(255,255,255,0.08)",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CameraIcon size={15} /> Add Site Photo ({photos.length})
        </button>

        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px" }}
        >
          <Save size={15} /> {saving ? "Saving…" : "Save to Offline Queue"}
        </button>
      </div>
    </form>
  );
}
