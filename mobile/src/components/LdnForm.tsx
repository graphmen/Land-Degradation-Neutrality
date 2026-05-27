import { useState } from "react";
import { Camera as CameraIcon, MapPin, Save, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Geolocation } from "@capacitor/geolocation";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { saveLdnDraft } from "../lib/db";
import type { LdnDraft } from "../lib/db";

interface LdnFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onNavigateToQueue: () => void;
}

const DISTRICTS = [
  "Beitbridge", "Bulilima", "Chipinge", "Chiredzi", "Gwanda", 
  "Lupane", "Mangwe", "Masvingo", "Matobo", "Mutare", "Mwenezi", "Tsholotsho"
];

const LANDCOVERS = [
  "Forest Land", "Cropland", "Grassland", "Wetland", "Settlements", "Other Land"
];

const LANDUSES = [
  "Conservation Forestry", "Commercial Cropland", "Subsistence Cropland", 
  "Communal Grazing", "Wildlife Conservation", "Mining", "Urban Settlement", "Other"
];

const VEG_COVERS = [
  "High/Dense Cover", "Moderate Cover", "Low/Sparse Cover", "Bare Soil"
];

const DEGRADATION_SIGNS = [
  { val: "gully", label: "⚠️ Gully Erosion" },
  { val: "wind", label: "💨 Sheet / Wind Erosion" },
  { val: "trecut", label: "🪓 Tree Cutting / Deforestation" },
  { val: "overgraz", label: "🐄 Overgrazing" },
  { val: "salin", label: "🧂 Soil Salinization" },
  { val: "mining", label: "⛏️ Open-pit Mining Degradation" },
  { val: "none", label: "✅ No Visible Degradation" }
];

const TREE_LOSS_CAUSES = [
  { val: "fuel", label: "Fuelwood / Charcoal" },
  { val: "agric", label: "Agricultural Expansion" },
  { val: "timber", label: "Commercial Logging" },
  { val: "fire", label: "Veld Fires / Forest Fires" },
  { val: "clearing", label: "Artisanal Mining Clearing" },
  { val: "infra", label: "Infrastructure Expansion" }
];

const SEVERITIES = [
  "High", "Moderate", "Low", "None"
];

export default function LdnForm({ onSuccess, onError, onNavigateToQueue }: LdnFormProps) {
  const [step, setStep] = useState(1);
  const [loadingGps, setLoadingGps] = useState(false);

  // Form Fields State
  const [dist, setDist] = useState("");
  const [ward, setWard] = useState("");
  const [team, setTeam] = useState("");
  const [gps, setGps] = useState(""); // "lat lng alt acc"
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

  // GPS Sensor Handler with Browser Fallback
  const captureGps = async () => {
    setLoadingGps(true);
    try {
      // 1. Try Capacitor Native GPS
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== "granted") {
        await Geolocation.requestPermissions();
      }

      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;
      const accuracy = coordinates.coords.accuracy || 0;
      const altitude = coordinates.coords.altitude || 0;
      
      setGps(`${lat} ${lng} ${altitude} ${accuracy}`);
      onSuccess("GPS coordinates captured via native sensor!");
    } catch (e: any) {
      console.warn("Capacitor GPS failed, falling back to browser API:", e.message);
      
      // 2. Try HTML5 Browser Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = pos.coords.accuracy;
            const altitude = pos.coords.altitude || 0;
            setGps(`${lat} ${lng} ${altitude} ${accuracy}`);
            onSuccess("GPS coordinates captured via browser location service.");
            setLoadingGps(false);
          },
          (browserErr) => {
            console.error(browserErr);
            onError("Could not capture GPS. Please check permissions or enter coordinates manually.");
            setLoadingGps(false);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        onError("Geolocation sensors are not supported on this device.");
        setLoadingGps(false);
      }
    } finally {
      if (!navigator.geolocation) {
        setLoadingGps(false);
      }
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
      return dist !== "" && team !== "" && ceid !== "" && gps !== "";
    }
    if (step === 2) {
      return landcov !== "" && landus !== "";
    }
    return true;
  };

  // Save Draft Submission
  const handleSave = async () => {
    if (!dist || !team || !ceid || !gps) {
      onError("Please fill in all general info fields (District, Team ID, CE Point ID, and GPS) before saving.");
      setStep(1);
      return;
    }

    const draft: LdnDraft = {
      id: `ldn_${Date.now()}`,
      measurement_date: new Date().toISOString().split("T")[0],
      dist,
      ward,
      Team: team,
      GPS: gps,
      ceid,
      landcov,
      landus,
      use_spec: landus === "Other" ? useSpec : undefined,
      lndmat,
      ex_mism: (lndmat === "no" || lndmat === "part") ? exMism : undefined,
      veg_cov: vegCov,
      signs_ero: signsEro,
      tree: signsEro.includes("trecut") ? tree : undefined,
      sev,
      oth,
      im: im || undefined,
      synced: false,
      createdAt: Date.now()
    };

    try {
      await saveLdnDraft(draft);
      onSuccess(`LDN Draft for Point ID ${ceid} saved locally!`);
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
          <h3>🌳 General Info (Step 1/3)</h3>
          <p className="card-desc">Identify the Collect Earth point boundary and coordinate baselines.</p>
          
          <div className="form-group">
            <label className="form-label">District *</label>
            <select className="form-input form-select" value={dist} onChange={(e) => setDist(e.target.value)}>
              <option value="">-- Select District --</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
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
            <label className="form-label">Collect Earth Point ID *</label>
            <input type="text" className="form-input" placeholder="e.g. CE_9104" value={ceid} onChange={(e) => setCeid(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">GPS Location *</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" className="form-input" placeholder="Latitude / Longitude values" value={gps} readOnly />
              <button 
                onClick={captureGps}
                disabled={loadingGps}
                className="btn-secondary" 
                style={{ width: "60px", padding: 0 }}
                title="Get GPS Coordinates"
              >
                {loadingGps ? <RefreshCw size={18} className="sync-icon-spin" /> : <MapPin size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mobile-card">
          <h3>🌿 Land Cover Class (Step 2/3)</h3>
          <p className="card-desc">Determine the current ecosystem canopy type and land use metrics.</p>

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
              {LANDUSES.map(lu => <option key={lu} value={lu}>{lu}</option>)}
            </select>
          </div>

          {landus === "Other" && (
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
          <h3>🏜️ Land Degradation Indicators (Step 3/3)</h3>
          <p className="card-desc">Flag erosion markers, vegetation status, and deforestation causes.</p>

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
            <Save size={16} /> Save Survey Draft
          </button>
        )}
      </div>

    </div>
  );
}
