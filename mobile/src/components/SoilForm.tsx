import { useState, useEffect } from "react";
import { MapPin, Save, ChevronLeft, ChevronRight, RefreshCw, Plus, Trash } from "lucide-react";
import { Geolocation } from "@capacitor/geolocation";
import { saveSoilDraft, getSoilDraft } from "../lib/db";
import type { SoilDraft, SoilCoreDraft } from "../lib/db";

interface SoilFormProps {
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

const LOCATIONS = [
  { val: "cent", label: "Center Location" },
  { val: "north", label: "North Boundary" },
  { val: "east", label: "East Boundary" },
  { val: "south", label: "South Boundary" },
  { val: "west", label: "West Boundary" }
];

const MOISTURE_LEVELS = [
  "Wet", "Saturated", "Moist", "Dry"
];

const TEXTURES = [
  "Clay", "Loam", "Sand", "Silt"
];

export default function SoilForm({ onSuccess, onError, onNavigateToQueue, editingDraftId, onClearEdit }: SoilFormProps) {
  const [step, setStep] = useState(1);
  const [loadingGps, setLoadingGps] = useState(false);

  // Form Fields State
  const [province, setProvince] = useState("");
  const [dist, setDist] = useState("");
  const [ward, setWard] = useState("");
  const [team, setTeam] = useState("");
  const [ceid, setCeid] = useState("");
  
  // Repeatable core samples state
  const [cores, setCores] = useState<SoilCoreDraft[]>([]);

  // Load draft data if editing
  useEffect(() => {
    if (editingDraftId) {
      getSoilDraft(editingDraftId).then((draft) => {
        if (draft) {
          const foundProvince = Object.keys(PROVINCE_DISTRICTS).find(prov => 
            PROVINCE_DISTRICTS[prov].includes(draft.dist)
          ) || "";
          
          setProvince(foundProvince);
          setDist(draft.dist || "");
          setWard(draft.ward || "");
          setTeam(draft.Team || "");
          setCeid(draft.ceid || "");
          setCores(draft.cores || []);
          
          // Go directly to step 1 when editing
          setStep(1);
        }
      });
    }
  }, [editingDraftId]);

  // Core item being edited state (Draft modal/fields)
  const [samloc, setSamloc] = useState("");
  const [coreGps, setCoreGps] = useState("");
  const [dep, setDep] = useState(30);
  const [moisture, setMoisture] = useState("");
  const [col, setCol] = useState("");
  const [tex, setTex] = useState("");

  // GPS Sensor Handler with Browser Fallback for Cores
  const captureGps = async () => {
    setLoadingGps(true);
    try {
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
      
      setCoreGps(`${lat} ${lng} ${altitude} ${accuracy}`);
      onSuccess("GPS coordinates captured via native sensor!");
    } catch (e: any) {
      console.warn("Capacitor GPS failed, falling back to browser API:", e.message);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = pos.coords.accuracy;
            const altitude = pos.coords.altitude || 0;
            setCoreGps(`${lat} ${lng} ${altitude} ${accuracy}`);
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

  // Add Core to repeatable list
  const addCoreSample = () => {
    if (!samloc || !coreGps || !tex) {
      onError("Please fill in the core Sample Location, GPS, and Texture fields first.");
      return;
    }

    const newCore: SoilCoreDraft = {
      samloc,
      poin: coreGps,
      dep: Number(dep),
      moisture,
      col,
      tex
    };

    setCores(prev => [...prev, newCore]);
    onSuccess("Soil core sample added to repeatable list.");

    // Reset core fields
    setSamloc("");
    setCoreGps("");
    setDep(30);
    setMoisture("");
    setCol("");
    setTex("");
  };

  // Remove Core from repeatable list
  const removeCoreSample = (index: number) => {
    setCores(prev => prev.filter((_, idx) => idx !== index));
    onSuccess("Soil core sample removed.");
  };

  // Save Soil Draft Submission
  const handleSave = async () => {
    if (!province || !dist || !team || !ceid) {
      onError("Please fill in all general info fields (Province, District, Team ID, and CE Point ID).");
      setStep(1);
      return;
    }

    if (cores.length === 0) {
      onError("You must record at least one soil core sample in the repeatable list.");
      return;
    }

    const draft: SoilDraft = {
      id: editingDraftId || `soil_${Date.now()}`,
      measurement_date: new Date().toISOString().split("T")[0],
      dist,
      ward,
      Team: team,
      ceid,
      cores,
      synced: false,
      createdAt: Date.now()
    };

    try {
      await saveSoilDraft(draft);
      onSuccess(`Soil core survey with ${cores.length} samples ${editingDraftId ? "updated" : "saved"} locally!`);
      onClearEdit?.();
      onNavigateToQueue();
    } catch (e: any) {
      onError(`Failed to save draft: ${e.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* Progress Wizard */}
      <div className="wizard-steps" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className={`wizard-step ${step === 1 ? "active" : step > 1 ? "completed" : ""}`} style={{ margin: "0 auto 0 0" }}>1</div>
        <div className={`wizard-step ${step === 2 ? "active" : step > 2 ? "completed" : ""}`} style={{ margin: "0 0 0 auto" }}>2</div>
      </div>

      {/* Step Panels */}
      {step === 1 && (
        <div className="mobile-card">
          <h3>🧪 Soil General Info (Step 1/2)</h3>
          <p className="card-desc">Identify the regional boundary and surveyor team details.</p>
          
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
            <input type="number" className="form-input" placeholder="e.g. 12" value={ward} onChange={(e) => setWard(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Team ID *</label>
            <input type="text" className="form-input" placeholder="e.g. Team Beta" value={team} onChange={(e) => setTeam(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Collect Earth Point ID *</label>
            <input type="text" className="form-input" placeholder="e.g. CE_3408" value={ceid} onChange={(e) => setCeid(e.target.value)} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mobile-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h3>🧬 Repeatable Soil Cores (Step 2/2)</h3>
            <p className="card-desc">Add multiple core samples (Center, North, East, South, West) inside the site boundary.</p>
          </div>

          {/* Repeatable Cores List */}
          {cores.length > 0 && (
            <div className="repeatable-list">
              <label className="form-label">Active Core Samples List ({cores.length})</label>
              {cores.map((c, index) => {
                const locObj = LOCATIONS.find(l => l.val === c.samloc);
                const locLabel = locObj ? locObj.label : c.samloc;
                return (
                  <div key={index} className="repeatable-item">
                    <div className="repeatable-item-header">
                      <span className="repeatable-item-title">Core #{index + 1} ({locLabel})</span>
                      <button className="btn-danger" style={{ padding: "4px 8px", fontSize: "10px" }} onClick={() => removeCoreSample(index)}>
                        <Trash size={12} /> Remove
                      </button>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      <div>Depth: <strong>{c.dep} cm</strong></div>
                      <div>Texture: <strong>{c.tex}</strong></div>
                      <div>Moisture: <strong>{c.moisture || "—"}</strong></div>
                      <div>Color: <strong>{c.col || "—"}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* New Core Input Section */}
          <div style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>Add New Soil Core</div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "10px" }}>Sample Location *</label>
              <select className="form-input form-select" value={samloc} onChange={(e) => setSamloc(e.target.value)}>
                <option value="">-- Select Location --</option>
                {LOCATIONS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "10px" }}>GPS coordinates *</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input type="text" className="form-input" placeholder="lat, lng coordinate values" value={coreGps} readOnly />
                <button onClick={captureGps} disabled={loadingGps} className="btn-secondary" style={{ width: "45px", padding: 0 }}>
                  {loadingGps ? <RefreshCw size={14} className="sync-icon-spin" /> : <MapPin size={14} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "10px" }}>Depth of core (cm)</label>
              <input type="number" className="form-input" value={dep} onChange={(e) => setDep(Number(e.target.value))} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "10px" }}>Soil color (e.g. 10YR 3/2)</label>
              <input type="text" className="form-input" placeholder="RGB or Munsell Color" value={col} onChange={(e) => setCol(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "10px" }}>Moisture Status</label>
              <select className="form-input form-select" value={moisture} onChange={(e) => setMoisture(e.target.value)}>
                <option value="">-- Select Moisture --</option>
                {MOISTURE_LEVELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "10px" }}>Soil Texture *</label>
              <select className="form-input form-select" value={tex} onChange={(e) => setTex(e.target.value)}>
                <option value="">-- Select Texture --</option>
                {TEXTURES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <button className="btn-secondary" style={{ marginTop: "6px", gap: "6px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-active)", color: "var(--text-accent)" }} onClick={addCoreSample}>
              <Plus size={14} /> Add Core to List
            </button>
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
        
        {step < 2 ? (
          <button 
            className="btn-primary" 
            style={{ flex: 2 }} 
            onClick={() => setStep(s => s + 1)}
            disabled={!province || !dist || !team || !ceid}
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn-primary" style={{ flex: 2, background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }} onClick={handleSave}>
            <Save size={16} /> {editingDraftId ? "Update Soil Core Survey" : "Save Soil Core Survey"}
          </button>
        )}
      </div>

    </div>
  );
}
