import { useEffect, useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Camera as CameraIcon, Save, ShieldCheck } from "lucide-react";
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

interface InterventionFormProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onSaved: () => void;
}

const SLM_PRACTICES = [
  "Reforestation / Afforestation",
  "Vetiver Grass Planting",
  "Contour Ridges & Terracing",
  "Gabions / Gully Reclamation",
  "Wetland Protection & Fencing",
  "Conservation Agriculture (Pfumvudza)",
  "Controlled / Holistic Grazing",
  "Invasive Species Clearing & Rehab",
];

export default function InterventionForm({
  onSuccess,
  onError,
  onSaved,
}: InterventionFormProps) {
  const [projectName, setProjectName] = useState("");
  const [hierarchy, setHierarchy] = useState<"avoid" | "reduce" | "reverse">("reverse");
  const [practice, setPractice] = useState(SLM_PRACTICES[0]);
  const [partner, setPartner] = useState("EMA");
  const [financeSource, setFinanceSource] = useState("GEF 7 / National Budget");

  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [enumerator, setEnumerator] = useState("");
  const [team, setTeam] = useState("");

  const [restoredHa, setRestoredHa] = useState("");
  const [progressPct, setProgressPct] = useState("50");
  const [benMen, setBenMen] = useState("");
  const [benWomen, setBenWomen] = useState("");
  const [benYouth, setBenYouth] = useState("");
  const [notes, setNotes] = useState("");

  const [geometry, setGeometry] = useState<SpatialGeometry>({
    mode: "polygon",
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
            caption: `Restoration photo #${prev.length + 1}`,
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
    if (!projectName.trim() || !district) {
      onError("Project name, Province, and District are required.");
      return;
    }
    if (!geometry.point && (geometry.polygon?.vertex_count ?? 0) < 3) {
      onError("Please capture a GPS point or walk the intervention boundary.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const men = Number(benMen) || 0;
      const women = Number(benWomen) || 0;
      const youth = Number(benYouth) || 0;

      const sub: UniversalSubmission = {
        submission_id: generateUuid(),
        module_id: "so4_interventions",
        form_version: "1.0.0",
        reporting_period: "2020-2023",
        enumerator: { name: enumerator || "Field Officer", team: team || "EMA" },
        location: { province, district, ward, site_name: projectName.trim() },
        geometry,
        photos,
        payload: {
          project_name: projectName.trim(),
          ldn_response_hierarchy: hierarchy,
          slm_practice: practice,
          implementing_partner: partner,
          finance_source_so5: financeSource,
          restored_area_ha: restoredHa ? Number(restoredHa) : geometry.polygon?.area_ha ?? null,
          progress_percent: Number(progressPct) || 0,
          beneficiaries: {
            men,
            women,
            youth,
            total: men + women + youth,
          },
          notes,
        },
        governance: {
          data_tier: "field_verify",
          verification_status: "submitted",
          code_list_version: "1.0",
          sensitivity: "standard",
        },
        sync_state: "pending",
        created_at: now,
        updated_at: now,
      };

      await saveModularSubmission(sub);
      onSuccess("Restoration intervention saved to offline queue.");
      onSaved();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to save intervention.");
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
      <h2 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
        <ShieldCheck size={17} color="#0b4f2a" /> Restoration &amp; Bright Spot (SO4 / SO5)
      </h2>

      <div className="form-group">
        <label className="form-label">Project / Intervention Site Name</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Bikita Ward 14 Gully Reclamation"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10 }}>
        <div className="form-group">
          <label className="form-label">LDN Response Hierarchy</label>
          <select
            className="form-input"
            value={hierarchy}
            onChange={(e) => setHierarchy(e.target.value as "avoid" | "reduce" | "reverse")}
          >
            <option value="avoid">Avoid Degradation</option>
            <option value="reduce">Reduce Degradation</option>
            <option value="reverse">Reverse / Restore</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">SLM Practice</label>
          <select className="form-input" value={practice} onChange={(e) => setPractice(e.target.value)}>
            {SLM_PRACTICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.8fr", gap: 8 }}>
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

        <div className="form-group">
          <label className="form-label">Ward</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ward"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
          />
        </div>
      </div>

      <GpsPolygonCapture
        value={geometry}
        onChange={setGeometry}
        allowPolygon
        onAreaCalculated={(ha) => setRestoredHa(String(ha))}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Area Restored / Protected (ha)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            placeholder="Auto from polygon walk"
            value={restoredHa}
            onChange={(e) => setRestoredHa(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Completion / Survival (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            className="form-input"
            value={progressPct}
            onChange={(e) => setProgressPct(e.target.value)}
          />
        </div>
      </div>

      {/* UNCCD SO2 Disaggregated Beneficiaries */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div className="form-group">
          <label className="form-label">Beneficiaries (Men)</label>
          <input
            type="number"
            min={0}
            className="form-input"
            placeholder="0"
            value={benMen}
            onChange={(e) => setBenMen(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Women</label>
          <input
            type="number"
            min={0}
            className="form-input"
            placeholder="0"
            value={benWomen}
            onChange={(e) => setBenWomen(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Youth</label>
          <input
            type="number"
            min={0}
            className="form-input"
            placeholder="0"
            value={benYouth}
            onChange={(e) => setBenYouth(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Implementing Partner</label>
          <input
            type="text"
            className="form-input"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Finance Source (SO5)</label>
          <input
            type="text"
            className="form-input"
            value={financeSource}
            onChange={(e) => setFinanceSource(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Progress & Verification Notes</label>
        <textarea
          className="form-input"
          rows={2}
          placeholder="Achievements, community structures, or maintenance needs…"
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
          <CameraIcon size={15} /> Add Photo ({photos.length})
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
