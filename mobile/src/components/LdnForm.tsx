import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Camera as CameraIcon,
  ChevronLeft,
  ChevronRight,
  Layers,
  Save,
  Trees,
} from "lucide-react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { saveLdnDraft, getLdnDraft } from "../lib/db";
import type { LdnDraft } from "../lib/db";
import {
  CODE_LIST_VERSION,
  getLdnLandCoverCode,
  getLdnLandCoverLabel,
  getLdnLandCoverOptions,
  getLdnLandUseCode,
  getLdnLandUseLabel,
  getLdnLandUseOptions,
  getLdnSeverityCode,
  getLdnSeverityLabel,
  getLdnSeverityOptions,
} from "../lib/code-lists";
import { loadEnumeratorProfile } from "../lib/enumerator-profile";
import GpsPolygonCapture from "./GpsPolygonCapture";
import type { SpatialGeometry } from "../lib/submission-envelope";

interface LdnFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onNavigateToQueue: () => void;
  editingDraftId?: string | null;
  onClearEdit?: () => void;
}

const PROVINCE_DISTRICTS: Record<string, string[]> = {
  "Bulawayo": ["Bulawayo"],
  "Harare": ["Harare", "Chitungwiza", "Epworth"],
  "Manicaland": ["Buhera", "Chimanimani", "Chipinge", "Makoni", "Mutare", "Mutasa", "Nyanga"],
  "Mashonaland Central": ["Bindura", "Mbire", "Guruve", "Mazowe", "Mount Darwin", "Rushinga", "Shamva", "Muzarabani"],
  "Mashonaland East": ["Chikomba", "Goromonzi", "Hwedza", "Marondera", "Mudzi", "Murehwa", "Mutoko", "Seke", "Uzumba-Maramba-Pfungwe"],
  "Mashonaland West": ["Chegutu", "Hurungwe", "Kariba", "Makonde", "Mhondoro-Ngezi", "Sanyati", "Zvimba"],
  "Masvingo": ["Bikita", "Chiredzi", "Chivi", "Gutu", "Masvingo", "Mwenezi", "Zaka"],
  "Matabeleland North": ["Binga", "Bubi", "Hwange", "Lupane", "Nkayi", "Tsholotsho", "Umguza"],
  "Matabeleland South": ["Beitbridge", "Bulilima", "Mangwe", "Gwanda", "Insiza", "Matobo", "Umzingwane"],
  "Midlands": ["Chirumhanzu", "Gokwe North", "Gokwe South", "Gweru", "Kwekwe", "Mberengwa", "Shurugwi", "Zvishavane"]
};

const LANDCOVERS = getLdnLandCoverOptions().map((o) => o.label);

const LAND_USE_OPTIONS = getLdnLandUseOptions();

const VEG_COVERS = [
  "High/Dense Cover", "Moderate Cover", "Low/Sparse Cover", "Bare Soil"
];

const DEGRADATION_SIGNS = [
  { val: "gully", label: "Gully Erosion" },
  { val: "wind", label: "Sheet / Wind Erosion" },
  { val: "trecut", label: "Tree Cutting / Deforestation" },
  { val: "overgraz", label: "Overgrazing" },
  { val: "salin", label: "Soil Salinization" },
  { val: "mining", label: "Open-pit Mining Degradation" },
  { val: "none", label: "No Visible Degradation" }
];

const TREE_LOSS_CAUSES = [
  { val: "fuel", label: "Fuelwood / Charcoal" },
  { val: "agric", label: "Agricultural Expansion" },
  { val: "timber", label: "Commercial Logging" },
  { val: "fire", label: "Veld Fires / Forest Fires" },
  { val: "clearing", label: "Artisanal Mining Clearing" },
  { val: "infra", label: "Infrastructure Expansion" }
];

const SEVERITIES = getLdnSeverityOptions();

export default function LdnForm({ onSuccess, onError, onNavigateToQueue, editingDraftId, onClearEdit }: LdnFormProps) {
  const [step, setStep] = useState(1);

  // Form Fields State
  const [province, setProvince] = useState("");
  const [dist, setDist] = useState("");
  const [ward, setWard] = useState("");
  const [team, setTeam] = useState("");
  const [gps, setGps] = useState(""); // "lat lng alt acc"
  const [geometry, setGeometry] = useState<SpatialGeometry>({
    mode: "point",
    point: null,
    polygon: null,
  });

  // Auto-fill from saved Enumerator Profile when creating a new draft
  useEffect(() => {
    if (!editingDraftId) {
      loadEnumeratorProfile().then((p) => {
        if (p.province) setProvince((cur) => cur || p.province);
        if (p.district) setDist((cur) => cur || p.district);
        if (p.ward) setWard((cur) => cur || p.ward);
        if (p.team || p.enumeratorName) setTeam((cur) => cur || p.team || p.enumeratorName);
      });
    }
  }, [editingDraftId]);
  const [ceid, setCeid] = useState("");
  const [landcov, setLandcov] = useState("");
  const [landus, setLandus] = useState("");
  const [useSpec, setUseSpec] = useState("");
  const [lndmat, setLndmat] = useState("");
  const [exMism, setExMism] = useState("");
  const [vegCov, setVegCov] = useState("");
  const [signsEro, setSignsEro] = useState<string[]>([]);
  const [tree, setTree] = useState<string[]>([]);
  const [sev, setSev] = useState("");
  const [oth, setOth] = useState("");
  const [im, setIm] = useState<string>(""); // Base64 string for photo

  // Load draft data if editing
  useEffect(() => {
    if (editingDraftId) {
      getLdnDraft(editingDraftId).then((draft) => {
        if (draft) {
          const foundProvince = Object.keys(PROVINCE_DISTRICTS).find(prov => 
            PROVINCE_DISTRICTS[prov].includes(draft.dist)
          ) || "";
          
          setProvince(foundProvince);
          setDist(draft.dist || "");
          setWard(draft.ward || "");
          setTeam(draft.Team || "");
          setGps(draft.GPS || "");
          setCeid(draft.ceid || "");
          setLandcov(getLdnLandCoverLabel(draft.landcov || ""));
          setLandus(getLdnLandUseLabel(draft.landus || ""));
          setUseSpec(draft.use_spec || "");
          setLndmat(draft.lndmat || "");
          setExMism(draft.ex_mism || "");
          setVegCov(draft.veg_cov || "");
          setSignsEro(draft.signs_ero || []);
          setTree(draft.tree || []);
          setSev(getLdnSeverityLabel(draft.sev || ""));
          setOth(draft.oth || "");
          setIm(draft.im || "");
          
          // Go directly to step 1 when editing
          setStep(1);
        }
      });
    }
  }, [editingDraftId]);

  const handleGeometryChange = (next: SpatialGeometry) => {
    setGeometry(next);
    if (next.mode === "point" && next.point) {
      setGps(
        `${next.point.lat} ${next.point.lng} ${next.point.altitude ?? 0} ${next.point.accuracy_m ?? 0}`
      );
    } else if (next.mode === "polygon" && next.polygon && next.polygon.coordinates.length >= 3) {
      const pts = next.polygon.coordinates;
      const cLng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cLat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      setGps(`${cLat.toFixed(6)} ${cLng.toFixed(6)} 0 5`);
    } else {
      setGps("");
    }
  };

  // Camera Sensor Handler with Browser Fallback
  const capturePhoto = async () => {
    try {
      // 1. Try Capacitor Camera
      const image = await Camera.getPhoto({
        quality: 75,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });
      if (image.base64String) {
        setIm(`data:image/jpeg;base64,${image.base64String}`);
        onSuccess("Photo attached successfully!");
      }
    } catch (e: any) {
      console.warn("Capacitor camera failed or cancelled. Triggering fallback file input...", e.message);
      
      // 2. Browser fallback: Trigger custom file input click
      const fileInput = document.getElementById("mobile-fallback-image-input") as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    }
  };

  const handleFallbackImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIm(reader.result as string);
        onSuccess("Photo attached via file picker!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Checkbox select handlers
  const handleCheckboxChange = (val: string, group: "signs" | "tree") => {
    if (group === "signs") {
      setSignsEro(prev => {
        if (prev.includes(val)) {
          const next = prev.filter(x => x !== val);
          // If uncutting trees, remove reasons
          if (val === "trecut") setTree([]);
          return next;
        }
        return [...prev.filter(x => x !== "none"), val];
      });
    } else {
      setTree(prev => 
        prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
      );
    }
  };

  // Validate current step
  const canGoNext = () => {
    if (step === 1) {
      return province !== "" && dist !== "" && team !== "" && gps !== "";
    }
    if (step === 2) {
      return landcov !== "" && landus !== "";
    }
    return true;
  };

  // Save Draft Submission
  const handleSave = async () => {
    if (!province || !dist || !team || !gps) {
      onError("Please fill in Province, District, Team ID, and capture GPS or Polygon before saving.");
      setStep(1);
      return;
    }

    const siteRef = ceid.trim() || `SITE_${Date.now().toString().slice(-6)}`;

    const draft: LdnDraft = {
      id: editingDraftId || `ldn_${Date.now()}`,
      measurement_date: new Date().toISOString().split("T")[0],
      dist,
      ward,
      Team: team,
      GPS: gps,
      ceid: siteRef,
      landcov: getLdnLandCoverCode(landcov),
      landus: getLdnLandUseCode(landus),
      use_spec: getLdnLandUseCode(landus) === "other" ? useSpec : undefined,
      lndmat,
      ex_mism: (lndmat === "no" || lndmat === "part") ? exMism : undefined,
      veg_cov: vegCov,
      signs_ero: signsEro,
      tree: signsEro.includes("trecut") ? tree : undefined,
      sev: getLdnSeverityCode(sev),
      oth,
      im: im || undefined,
      geometry,
      area_ha: geometry.mode === "polygon" ? geometry.polygon?.area_ha ?? null : null,
      perimeter_m: geometry.mode === "polygon" ? geometry.polygon?.perimeter_m ?? null : null,
      code_list_version: CODE_LIST_VERSION,
      synced: false,
      createdAt: Date.now()
    };

    try {
      await saveLdnDraft(draft);
      onSuccess(`Land Cover observation (${siteRef}) ${editingDraftId ? "updated" : "saved"} locally.`);
      onClearEdit?.();
      onNavigateToQueue();
    } catch (e: any) {
      onError(`Failed to save draft: ${e.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      
      {/* Hidden fallback inputs */}
      <input 
        id="mobile-fallback-image-input"
        type="file" 
        accept="image/*" 
        capture="environment" 
        onChange={handleFallbackImage} 
        style={{ display: "none" }} 
      />

      {/* Progress Wizard */}
      <div className="wizard-steps">
        <div className={`wizard-step ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}>1</div>
        <div className={`wizard-step ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}>2</div>
        <div className={`wizard-step ${step === 3 ? "active" : step > 3 ? "completed" : ""}`}>3</div>
      </div>

      {/* Form Wizard Step Panels */}
      {step === 1 && (
        <div className="mobile-card">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Trees size={18} color="#043016" /> Site &amp; Spatial Boundary (Step 1/3)
          </h3>
          <p className="card-desc">Record administrative location and capture a GPS point or walk the site boundary (ha).</p>
          
          <div className="form-group">
            <label className="form-label">Province *</label>
            <select className="form-input form-select" value={province} onChange={(e) => {
              setProvince(e.target.value);
              setDist("");
            }}>
              <option value="">-- Select Province --</option>
              {Object.keys(PROVINCE_DISTRICTS).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">District *</label>
            <select 
              className="form-input form-select" 
              value={dist} 
              onChange={(e) => setDist(e.target.value)}
              disabled={!province}
            >
              <option value="">{province ? "-- Select District --" : "-- Select Province First --"}</option>
              {province && PROVINCE_DISTRICTS[province].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ward Number</label>
            <input type="number" className="form-input" placeholder="e.g. 5" value={ward} onChange={(e) => setWard(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Team ID *</label>
            <input type="text" className="form-input" placeholder="e.g. Team Alpha" value={team} onChange={(e) => setTeam(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Site / Plot Reference ID (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. WARD05_PLOT12 (auto-generated if blank)"
              value={ceid}
              onChange={(e) => setCeid(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">GPS Point or Polygon Walk *</label>
            <GpsPolygonCapture
              value={geometry}
              onChange={handleGeometryChange}
              allowPolygon={true}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mobile-card">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={18} color="#043016" /> Land Cover &amp; Use — UNCCD SO1-1 (Step 2/3)
          </h3>
          <p className="card-desc">Classify the UNCCD 7-class land cover and primary land use.</p>

          <div className="form-group">
            <label className="form-label">Landcover Class *</label>
            <select className="form-input form-select" value={landcov} onChange={(e) => setLandcov(e.target.value)}>
              <option value="">-- Select Class --</option>
              {LANDCOVERS.map(lc => <option key={lc} value={lc}>{lc}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Land Use Type *</label>
            <select className="form-input form-select" value={landus} onChange={(e) => setLandus(e.target.value)}>
              <option value="">-- Select Type --</option>
              {LAND_USE_OPTIONS.map((lu) => (
                <option key={lu.code} value={lu.label}>{lu.label}</option>
              ))}
            </select>
          </div>

          {getLdnLandUseCode(landus) === "other" && (
            <div className="form-group">
              <label className="form-label">Specify Land Use</label>
              <input type="text" className="form-input" placeholder="Specify land use details" value={useSpec} onChange={(e) => setUseSpec(e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Does LULC match Collect Earth Reference?</label>
            <select className="form-input form-select" value={lndmat} onChange={(e) => setLndmat(e.target.value)}>
              <option value="">-- Select Option --</option>
              <option value="yes">Yes, complete match</option>
              <option value="no">No, complete mismatch</option>
              <option value="part">Partially matches</option>
            </select>
          </div>

          {(lndmat === "no" || lndmat === "part") && (
            <div className="form-group">
              <label className="form-label">Describe difference / mismatch *</label>
              <textarea className="form-input" rows={3} placeholder="Describe the discrepancy..." value={exMism} onChange={(e) => setExMism(e.target.value)} />
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="mobile-card">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} color="#d97706" /> Land Degradation Indicators — SO1-2 (Step 3/3)
          </h3>
          <p className="card-desc">Record vegetation cover, erosion markers, tree loss drivers, and site photo.</p>

          <div className="form-group">
            <label className="form-label">Qualify vegetation cover</label>
            <select className="form-input form-select" value={vegCov} onChange={(e) => setVegCov(e.target.value)}>
              <option value="">-- Select Quality --</option>
              {VEG_COVERS.map(vc => <option key={vc} value={vc}>{vc}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Signs of Degradation (Multi-select)</label>
            <div className="form-checkbox-group">
              {DEGRADATION_SIGNS.map(item => {
                const checked = signsEro.includes(item.val);
                return (
                  <label key={item.val} className={`checkbox-label ${checked ? "checked" : ""}`}>
                    <input 
                      type="checkbox" 
                      checked={checked} 
                      onChange={() => handleCheckboxChange(item.val, "signs")} 
                    />
                    {item.label}
                  </label>
                );
              })}
            </div>
          </div>

          {signsEro.includes("trecut") && (
            <div className="form-group">
              <label className="form-label">Causes of Tree Loss (Multi-select) *</label>
              <div className="form-checkbox-group">
                {TREE_LOSS_CAUSES.map(item => {
                  const checked = tree.includes(item.val);
                  return (
                    <label key={item.val} className={`checkbox-label ${checked ? "checked" : ""}`}>
                      <input 
                        type="checkbox" 
                        checked={checked} 
                        onChange={() => handleCheckboxChange(item.val, "tree")} 
                      />
                      {item.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Degradation Severity Level</label>
            <select className="form-input form-select" value={sev} onChange={(e) => setSev(e.target.value)}>
              <option value="">-- Select Severity --</option>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Surveyor notes / Other comments</label>
            <input type="text" className="form-input" placeholder="Any additional notes" value={oth} onChange={(e) => setOth(e.target.value)} />
          </div>

          {/* Photo attachment */}
          <div className="form-group">
            <label className="form-label">Site Representative Photo</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
              <button onClick={capturePhoto} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                <CameraIcon size={16} /> Capture Photo (Native Camera)
              </button>
              {im && (
                <div style={{ position: "relative", width: "100%", maxHeight: "150px", overflow: "hidden", borderRadius: "var(--radius-md)" }}>
                  <img src={im} alt="Survey Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button 
                    onClick={() => setIm("")} 
                    style={{ position: "absolute", top: "5px", right: "5px", padding: "4px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
        {step > 1 && (
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(s => s - 1)}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        
        {step < 3 ? (
          <button 
            className="btn-primary" 
            style={{ flex: 2 }} 
            onClick={() => setStep(s => s + 1)}
            disabled={!canGoNext()}
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn-primary" style={{ flex: 2, background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }} onClick={handleSave}>
            <Save size={16} /> {editingDraftId ? "Update Survey Draft" : "Save Survey Draft"}
          </button>
        )}
      </div>

    </div>
  );
}
