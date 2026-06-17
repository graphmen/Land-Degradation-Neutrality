import { useState, useEffect } from "react";
import { MapPin, Save, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Geolocation } from "@capacitor/geolocation";
import { saveDrylandsDraft, getDrylandsDraft } from "../lib/db";
import type { DrylandsDraft } from "../lib/db";

interface DrylandsFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onNavigateToQueue: () => void;
  editingDraftId?: string | null;
  onClearEdit?: () => void;
}

const VEG_CONDITIONS = ["Intact", "Moderately Degraded", "Severely Degraded"];
const PRIORITY_LEVELS = ["Low", "Medium", "High (Immediate Action Required)"];
const SOIL_TYPES = ["Jecha (Sandy)", "Red sandy clay", "Very sandy infertile soil", "Clay", "Loamy sand", "Other"];
const AREA_TYPES = ["Arable", "Grazing", "Wetland", "Forest/Woodland", "Other"];
const LAND_COVERS = ["Cropland", "Grassland", "Woodland", "Bare Land", "Wetland Vegetation"];
const EROSION_TYPES = ["Sheet", "Rill", "Gully"];
const EROSION_SEVERITIES = ["None", "Low", "Moderate", "Severe"];
const WATER_SOURCES = ["Borehole", "River", "Wetland", "Stream", "Seasonal water point", "Other"];
const WATER_QUALITIES = ["Clear", "Slightly Turbid", "Highly Silted"];
const CLIMATE_INDICATORS = ["Prolonged dry spells", "Failed crops", "Drying wetlands", "Reduced stream flow", "Other"];
const LIVELIHOODS = ["Rain-fed farming", "Livestock rearing", "Brick moulding", "Irrigated gardening", "Other"];
const GRAZING_PRESSURES = ["Low", "Medium", "High"];
const LAND_CONFLICTS = ["Crop vs livestock", "Wetland encroachment", "None", "Other"];
const INTERVENTIONS = ["Vetiver planting", "Contour ridges", "Stone pitching", "Gabions", "Buffer demarcation", "Controlled grazing"];
const COST_CATEGORIES = ["Low", "Medium", "High"];

export default function DrylandsForm({ onSuccess, onError, onNavigateToQueue, editingDraftId, onClearEdit }: DrylandsFormProps) {
  const [step, setStep] = useState(1);
  const [loadingGps, setLoadingGps] = useState(false);

  // Form Fields State
  const [enumerator, setEnumerator] = useState("");
  const [dateObs, setDateObs] = useState(new Date().toISOString().split("T")[0]);
  const [ward, setWard] = useState("");
  const [village, setVillage] = useState("");
  const [gps, setGps] = useState("");
  const [areaType, setAreaType] = useState<string[]>([]);
  const [areaTypeOther, setAreaTypeOther] = useState("");

  const [dominantSoil, setDominantSoil] = useState(SOIL_TYPES[0]);
  const [dominantSoilOther, setDominantSoilOther] = useState("");
  const [distRiver, setDistRiver] = useState(0);
  const [distWetland, setDistWetland] = useState(0);
  const [distRoad, setDistRoad] = useState(0);
  const [waterSources, setWaterSources] = useState<string[]>([]);
  const [waterSourcesOther, setWaterSourcesOther] = useState("");
  const [waterQuality, setWaterQuality] = useState<string[]>([]);
  const [evidenceSiltation, setEvidenceSiltation] = useState("No");
  const [wetlandCultivation, setWetlandCultivation] = useState("No");
  const [waterNotes, setWaterNotes] = useState("");

  const [vegCondition, setVegCondition] = useState(VEG_CONDITIONS[0]);
  const [vegDescription, setVegDescription] = useState("");
  const [estimatedVegCover, setEstimatedVegCover] = useState(50);
  const [invasiveSpecies, setInvasiveSpecies] = useState("No");
  const [invasiveSpeciesName, setInvasiveSpeciesName] = useState("");
  const [currentLandCovers, setCurrentLandCovers] = useState<string[]>([]);
  const [currentLandCoverOther, setCurrentLandCoverOther] = useState("");
  const [soilErosionPresent, setSoilErosionPresent] = useState("No");
  const [typeOfErosion, setTypeOfErosion] = useState<string[]>([]);
  const [erosionSeverity, setErosionSeverity] = useState(EROSION_SEVERITIES[0]);
  const [gullyDimensions, setGullyDimensions] = useState("");
  const [erosionExpanding, setErosionExpanding] = useState("No");
  const [assetsThreatened, setAssetsThreatened] = useState<string[]>([]);
  const [assetsThreatenedOther, setAssetsThreatenedOther] = useState("");

  const [climateIndicators, setClimateIndicators] = useState<string[]>([]);
  const [climateOther, setClimateOther] = useState("");
  const [siteFloodProne, setSiteFloodProne] = useState("No");
  const [floodNotes, setFloodNotes] = useState("");
  const [evidenceFire, setEvidenceFire] = useState("No");
  const [fireNotes, setFireNotes] = useState("");
  const [signsDrought, setSignsDrought] = useState("No");
  const [droughtNotes, setDroughtNotes] = useState("");
  const [dominantLivelihoods, setDominantLivelihoods] = useState<string[]>([]);
  const [livelihoodNotes, setLivelihoodNotes] = useState("");
  const [grazingPressure, setGrazingPressure] = useState<string[]>([]);
  const [grazingNotes, setGrazingNotes] = useState("");
  const [landConflicts, setLandConflicts] = useState<string[]>([]);
  const [conflictNotes, setConflictNotes] = useState("");
  const [landUseCompatible, setLandUseCompatible] = useState("Yes");
  const [compatibilityExplanation, setCompatibilityExplanation] = useState("");
  const [priorityLevel, setPriorityLevel] = useState(PRIORITY_LEVELS[0]);
  const [priorityExplanation, setPriorityExplanation] = useState("");
  const [recommendedInterventions, setRecommendedInterventions] = useState<string[]>([]);
  const [interventionNotes, setInterventionNotes] = useState("");
  const [costCategory, setCostCategory] = useState(COST_CATEGORIES[0]);
  const [costExplanation, setCostExplanation] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Load draft data if editing
  useEffect(() => {
    if (editingDraftId) {
      getDrylandsDraft(editingDraftId).then((draft) => {
        if (draft) {
          setEnumerator(draft.enumerator_name || "");
          setDateObs(draft.date_of_observation || "");
          setWard(draft.ward_name || "");
          setVillage(draft.village_location || "");
          setGps(draft.coordinates || "");
          setAreaType(draft.area_type || []);
          setAreaTypeOther(draft.area_type_other || "");
          
          setDominantSoil(draft.dominant_soil_type || SOIL_TYPES[0]);
          setDominantSoilOther(draft.dominant_soil_type_other || "");
          setDistRiver(draft.distance_to_river || 0);
          setDistWetland(draft.distance_to_wetland || 0);
          setDistRoad(draft.distance_to_road || 0);
          setWaterSources(draft.water_sources_present || []);
          setWaterSourcesOther(draft.water_sources_other || "");
          setWaterQuality(draft.water_quality_visual || []);
          setEvidenceSiltation(draft.evidence_of_siltation || "No");
          setWetlandCultivation(draft.wetland_cultivation_observed || "No");
          setWaterNotes(draft.water_notes || "");

          setVegCondition(draft.vegetation_condition || VEG_CONDITIONS[0]);
          setVegDescription(draft.vegetation_description || "");
          setEstimatedVegCover(draft.estimated_vegetation_cover ?? 50);
          setInvasiveSpecies(draft.invasive_species_present || "No");
          setInvasiveSpeciesName(draft.invasive_species_name || "");
          setCurrentLandCovers(draft.current_land_cover_types || []);
          setCurrentLandCoverOther(draft.current_land_cover_other || "");
          setSoilErosionPresent(draft.soil_erosion_present || "No");
          setTypeOfErosion(draft.type_of_erosion || []);
          setErosionSeverity(draft.erosion_severity || EROSION_SEVERITIES[0]);
          setGullyDimensions(draft.gully_dimensions || "");
          setErosionExpanding(draft.erosion_expanding || "No");
          setAssetsThreatened(draft.assets_threatened || []);
          setAssetsThreatenedOther(draft.assets_threatened_other || "");

          setClimateIndicators(draft.climate_change_indicators || []);
          setClimateOther(draft.climate_change_other || "");
          setSiteFloodProne(draft.site_flood_prone || "No");
          setFloodNotes(draft.flood_notes || "");
          setEvidenceFire(draft.evidence_of_recent_fire || "No");
          setFireNotes(draft.fire_notes || "");
          setSignsDrought(draft.signs_of_drought_stress || "No");
          setDroughtNotes(draft.drought_notes || "");
          setDominantLivelihoods(draft.dominant_livelihoods || []);
          setLivelihoodNotes(draft.livelihood_notes || "");
          setGrazingPressure(draft.grazing_pressure || []);
          setGrazingNotes(draft.grazing_notes || "");
          setLandConflicts(draft.observed_land_use_conflicts || []);
          setConflictNotes(draft.conflict_notes || "");
          setLandUseCompatible(draft.land_use_compatible || "Yes");
          setCompatibilityExplanation(draft.compatibility_explanation || "");
          setPriorityLevel(draft.priority_level || PRIORITY_LEVELS[0]);
          setPriorityExplanation(draft.priority_explanation || "");
          setRecommendedInterventions(draft.recommended_interventions || []);
          setInterventionNotes(draft.intervention_notes || "");
          setCostCategory(draft.cost_category || COST_CATEGORIES[0]);
          setCostExplanation(draft.cost_explanation || "");
          setAdditionalNotes(draft.additional_notes || "");

          setStep(1);
        }
      });
    }
  }, [editingDraftId]);

  // GPS handler (with Capacitor Native and Browser geolocation fallback)
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
      
      setGps(`${lat.toFixed(6)} ${lng.toFixed(6)} ${altitude.toFixed(1)} ${accuracy.toFixed(1)}`);
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
            setGps(`${lat.toFixed(6)} ${lng.toFixed(6)} ${altitude.toFixed(1)} ${accuracy.toFixed(1)}`);
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

  const toggleListValue = (list: string[], setList: (v: string[]) => void, value: string) => {
    if (list.includes(value)) {
      setList(list.filter(item => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleSave = async () => {
    if (!enumerator || !ward || !village || !gps) {
      onError("Please fill in all Administrative details (Enumerator, Ward, Village, GPS) before saving.");
      setStep(1);
      return;
    }

    const draft: DrylandsDraft = {
      id: editingDraftId || `dry_${Date.now()}`,
      date_of_observation: dateObs,
      enumerator_name: enumerator,
      ward_name: ward,
      village_location: village,
      coordinates: gps,
      area_type: areaType,
      area_type_other: areaTypeOther,
      dominant_soil_type: dominantSoil,
      dominant_soil_type_other: dominantSoilOther,
      distance_to_river: Number(distRiver),
      distance_to_wetland: Number(distWetland),
      distance_to_road: Number(distRoad),
      water_sources_present: waterSources,
      water_sources_other: waterSourcesOther,
      water_quality_visual: waterQuality,
      evidence_of_siltation: evidenceSiltation,
      wetland_cultivation_observed: wetlandCultivation,
      water_notes: waterNotes,
      vegetation_condition: vegCondition,
      vegetation_description: vegDescription,
      estimated_vegetation_cover: Number(estimatedVegCover),
      invasive_species_present: invasiveSpecies,
      invasive_species_name: invasiveSpeciesName,
      current_land_cover_types: currentLandCovers,
      current_land_cover_other: currentLandCoverOther,
      soil_erosion_present: soilErosionPresent,
      type_of_erosion: typeOfErosion,
      erosion_severity: erosionSeverity,
      gully_dimensions: gullyDimensions,
      erosion_expanding: erosionExpanding,
      assets_threatened: assetsThreatened,
      assets_threatened_other: assetsThreatenedOther,
      climate_change_indicators: climateIndicators,
      climate_change_other: climateOther,
      site_flood_prone: siteFloodProne,
      flood_notes: floodNotes,
      evidence_of_recent_fire: evidenceFire,
      fire_notes: fireNotes,
      signs_of_drought_stress: signsDrought,
      drought_notes: droughtNotes,
      dominant_livelihoods: dominantLivelihoods,
      livelihood_notes: livelihoodNotes,
      grazing_pressure: grazingPressure,
      grazing_notes: grazingNotes,
      observed_land_use_conflicts: landConflicts,
      conflict_notes: conflictNotes,
      land_use_compatible: landUseCompatible,
      compatibility_explanation: compatibilityExplanation,
      priority_level: priorityLevel,
      priority_explanation: priorityExplanation,
      recommended_interventions: recommendedInterventions,
      intervention_notes: interventionNotes,
      cost_category: costCategory,
      cost_explanation: costExplanation,
      additional_notes: additionalNotes,
      synced: false,
      createdAt: Date.now()
    };

    try {
      await saveDrylandsDraft(draft);
      onSuccess(`Drylands record ${editingDraftId ? "updated" : "saved"} offline in telemetry queue!`);
      onClearEdit?.();
      onNavigateToQueue();
    } catch (e: any) {
      onError(`Failed to save draft: ${e.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      
      {/* 4-Step Wizard */}
      <div className="wizard-steps" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className={`wizard-step ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}>1</div>
        <div className={`wizard-step ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}>2</div>
        <div className={`wizard-step ${step === 3 ? "active" : step > 3 ? "completed" : ""}`}>3</div>
        <div className={`wizard-step ${step === 4 ? "active" : step > 4 ? "completed" : ""}`}>4</div>
      </div>

      {/* STEP 1: ADMINISTRATIVE */}
      {step === 1 && (
        <div className="mobile-card">
          <h3>🏜️ Admin & Area Info (Step 1/4)</h3>
          <p className="card-desc">Record surveyor identity and geographic boundaries.</p>
          
          <div className="form-group">
            <label className="form-label">Enumerator Name *</label>
            <input type="text" className="form-input" placeholder="e.g. Chenjerai Hove" value={enumerator} onChange={(e) => setEnumerator(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Date of Observation *</label>
            <input type="date" className="form-input" value={dateObs} onChange={(e) => setDateObs(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Ward Name/Number *</label>
            <input type="text" className="form-input" placeholder="e.g. Ward 11" value={ward} onChange={(e) => setWard(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Village Location *</label>
            <input type="text" className="form-input" placeholder="e.g. Gutu Mission Area" value={village} onChange={(e) => setVillage(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">GPS coordinates (Lat Lng Alt Acc) *</label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input type="text" className="form-input" placeholder="Tap marker to query GPS" value={gps} readOnly />
              <button onClick={captureGps} disabled={loadingGps} className="btn-secondary" style={{ width: "45px", padding: 0 }}>
                {loadingGps ? <RefreshCw size={14} className="sync-icon-spin" /> : <MapPin size={14} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Area Type (Select all that apply)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "4px 0" }}>
              {AREA_TYPES.map(at => (
                <button
                  type="button"
                  key={at}
                  onClick={() => toggleListValue(areaType, setAreaType, at)}
                  className={`btn-select-pill ${areaType.includes(at) ? "active" : ""}`}
                >
                  {at}
                </button>
              ))}
            </div>
            {areaType.includes("Other") && (
              <input type="text" className="form-input" style={{ marginTop: 6 }} placeholder="Please specify area type..." value={areaTypeOther} onChange={(e) => setAreaTypeOther(e.target.value)} />
            )}
          </div>
        </div>
      )}

      {/* STEP 2: SOIL & WATER */}
      {step === 2 && (
        <div className="mobile-card">
          <h3>💧 Soil & Water Profile (Step 2/4)</h3>
          <p className="card-desc">Assess soil conditions, proximity to key water sources, and quality indicators.</p>

          <div className="form-group">
            <label className="form-label">Dominant Soil Type *</label>
            <select className="form-input form-select" value={dominantSoil} onChange={(e) => setDominantSoil(e.target.value)}>
              {SOIL_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
            {dominantSoil === "Other" && (
              <input type="text" className="form-input" style={{ marginTop: 6 }} placeholder="Please specify soil type..." value={dominantSoilOther} onChange={(e) => setDominantSoilOther(e.target.value)} />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Distance to Nearest River (meters)</label>
            <input type="number" className="form-input" value={distRiver} onChange={(e) => setDistRiver(Number(e.target.value))} />
          </div>

          <div className="form-group">
            <label className="form-label">Distance to Nearest Wetland (meters)</label>
            <input type="number" className="form-input" value={distWetland} onChange={(e) => setDistWetland(Number(e.target.value))} />
          </div>

          <div className="form-group">
            <label className="form-label">Distance to Main Road (meters)</label>
            <input type="number" className="form-input" value={distRoad} onChange={(e) => setDistRoad(Number(e.target.value))} />
          </div>

          <div className="form-group">
            <label className="form-label">Water Sources Present</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "4px 0" }}>
              {WATER_SOURCES.map(ws => (
                <button
                  type="button"
                  key={ws}
                  onClick={() => toggleListValue(waterSources, setWaterSources, ws)}
                  className={`btn-select-pill ${waterSources.includes(ws) ? "active" : ""}`}
                >
                  {ws}
                </button>
              ))}
            </div>
            {waterSources.includes("Other") && (
              <input type="text" className="form-input" style={{ marginTop: 6 }} placeholder="Please specify water source..." value={waterSourcesOther} onChange={(e) => setWaterSourcesOther(e.target.value)} />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Water Quality Visual Assessment</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "4px 0" }}>
              {WATER_QUALITIES.map(wq => (
                <button
                  type="button"
                  key={wq}
                  onClick={() => toggleListValue(waterQuality, setWaterQuality, wq)}
                  className={`btn-select-pill ${waterQuality.includes(wq) ? "active" : ""}`}
                >
                  {wq}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Is there evidence of siltation?</label>
            <select className="form-input form-select" style={{ width: "100px" }} value={evidenceSiltation} onChange={(e) => setEvidenceSiltation(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Is cultivation happening inside the wetland?</label>
            <select className="form-input form-select" style={{ width: "100px" }} value={wetlandCultivation} onChange={(e) => setWetlandCultivation(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Water & Hydrological Notes</label>
            <textarea className="form-input" style={{ height: "60px" }} placeholder="Describe flows, degradation or use conflicts..." value={waterNotes} onChange={(e) => setWaterNotes(e.target.value)} />
          </div>
        </div>
      )}

      {/* STEP 3: VEGETATION & EROSION */}
      {step === 3 && (
        <div className="mobile-card">
          <h3>🌿 Vegetation & Erosion (Step 3/4)</h3>
          <p className="card-desc">Evaluate the land cover health, invasive plant expansion, and soil erosion severity.</p>

          <div className="form-group">
            <label className="form-label">Vegetation Condition *</label>
            <select className="form-input form-select" value={vegCondition} onChange={(e) => setVegCondition(e.target.value)}>
              {VEG_CONDITIONS.map(vc => <option key={vc} value={vc}>{vc}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Vegetation Condition Details</label>
            <input type="text" className="form-input" placeholder="e.g. sparse canopy, heavy grazing cuts" value={vegDescription} onChange={(e) => setVegDescription(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Vegetation Cover: {estimatedVegCover}%</label>
            <input type="range" className="form-input" min="0" max="100" value={estimatedVegCover} onChange={(e) => setEstimatedVegCover(Number(e.target.value))} />
          </div>

          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Are invasive species present?</label>
            <select className="form-input form-select" style={{ width: "100px" }} value={invasiveSpecies} onChange={(e) => setInvasiveSpecies(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {invasiveSpecies === "Yes" && (
            <div className="form-group">
              <label className="form-label">Invasive Species Name</label>
              <input type="text" className="form-input" placeholder="e.g. Lantana Camara" value={invasiveSpeciesName} onChange={(e) => setInvasiveSpeciesName(e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Current Land Cover Types</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "4px 0" }}>
              {LAND_COVERS.map(lc => (
                <button
                  type="button"
                  key={lc}
                  onClick={() => toggleListValue(currentLandCovers, setCurrentLandCovers, lc)}
                  className={`btn-select-pill ${currentLandCovers.includes(lc) ? "active" : ""}`}
                >
                  {lc}
                </button>
              ))}
            </div>
            {currentLandCovers.includes("Other") && (
              <input type="text" className="form-input" style={{ marginTop: 6 }} placeholder="Specify land cover..." value={currentLandCoverOther} onChange={(e) => setCurrentLandCoverOther(e.target.value)} />
            )}
          </div>

          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Is soil erosion active?</label>
            <select className="form-input form-select" style={{ width: "100px" }} value={soilErosionPresent} onChange={(e) => setSoilErosionPresent(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {soilErosionPresent === "Yes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px", border: "1px solid var(--border-color)", borderRadius: 6, background: "rgba(0,0,0,0.05)" }}>
              <div className="form-group">
                <label className="form-label">Type of Erosion Active</label>
                <div style={{ display: "flex", gap: 6, margin: "4px 0" }}>
                  {EROSION_TYPES.map(et => (
                    <button
                      type="button"
                      key={et}
                      onClick={() => toggleListValue(typeOfErosion, setTypeOfErosion, et)}
                      className={`btn-select-pill ${typeOfErosion.includes(et) ? "active" : ""}`}
                      style={{ flex: 1 }}
                    >
                      {et}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Erosion Severity Level</label>
                <select className="form-input form-select" value={erosionSeverity} onChange={(e) => setErosionSeverity(e.target.value)}>
                  {EROSION_SEVERITIES.map(es => <option key={es} value={es}>{es}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Gully Dimensions (if Gully selected)</label>
                <input type="text" className="form-input" placeholder="Length: Xm, Width: Ym, Depth: Zm" value={gullyDimensions} onChange={(e) => setGullyDimensions(e.target.value)} />
              </div>

              <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Is the erosion area expanding?</label>
                <select className="form-input form-select" style={{ width: "100px" }} value={erosionExpanding} onChange={(e) => setErosionExpanding(e.target.value)}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Key Infrastructure/Assets Threatened</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "4px 0" }}>
                  {["Cropland", "Grazing Land", "Wetland", "Homestead", "School/Clinic", "Other"].map(a => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => toggleListValue(assetsThreatened, setAssetsThreatened, a)}
                      className={`btn-select-pill ${assetsThreatened.includes(a) ? "active" : ""}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                {assetsThreatened.includes("Other") && (
                  <input type="text" className="form-input" style={{ marginTop: 6 }} placeholder="Specify infrastructure..." value={assetsThreatenedOther} onChange={(e) => setAssetsThreatenedOther(e.target.value)} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: IMPACT & RECOMMENDATIONS */}
      {step === 4 && (
        <div className="mobile-card">
          <h3>🛠️ Climate & Recommendations (Step 4/4)</h3>
          <p className="card-desc">Evaluate drought indices, livelihood factors, and proposed interventions.</p>

          <div className="form-group">
            <label className="form-label">Climate Change Vulnerability Indicators</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "4px 0" }}>
              {CLIMATE_INDICATORS.map(cci => (
                <button
                  type="button"
                  key={cci}
                  onClick={() => toggleListValue(climateIndicators, setClimateIndicators, cci)}
                  className={`btn-select-pill ${climateIndicators.includes(cci) ? "active" : ""}`}
                >
                  {cci}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", margin: "10px 0" }}>
            <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Is this site flood prone?</label>
              <select className="form-input form-select" style={{ width: "90px" }} value={siteFloodProne} onChange={(e) => setSiteFloodProne(e.target.value)}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            
            <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Evidence of recent fire?</label>
              <select className="form-input form-select" style={{ width: "90px" }} value={evidenceFire} onChange={(e) => setEvidenceFire(e.target.value)}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            
            <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Signs of drought stress?</label>
              <select className="form-input form-select" style={{ width: "90px" }} value={signsDrought} onChange={(e) => setSignsDrought(e.target.value)}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Dominant Livelihoods</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "4px 0" }}>
              {LIVELIHOODS.map(l => (
                <button
                  type="button"
                  key={l}
                  onClick={() => toggleListValue(dominantLivelihoods, setDominantLivelihoods, l)}
                  className={`btn-select-pill ${dominantLivelihoods.includes(l) ? "active" : ""}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Grazing Pressure Status</label>
            <div style={{ display: "flex", gap: 6, margin: "4px 0" }}>
              {GRAZING_PRESSURES.map(gp => (
                <button
                  type="button"
                  key={gp}
                  onClick={() => toggleListValue(grazingPressure, setGrazingPressure, gp)}
                  className={`btn-select-pill ${grazingPressure.includes(gp) ? "active" : ""}`}
                  style={{ flex: 1 }}
                >
                  {gp}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Are land use conflicts observed?</label>
            <div style={{ display: "flex", gap: 4 }}>
              {LAND_CONFLICTS.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => toggleListValue(landConflicts, setLandConflicts, c)}
                  className={`btn-select-pill ${landConflicts.includes(c) ? "active" : ""}`}
                  style={{ fontSize: "10px", padding: "4px 8px" }}
                >
                  {c.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Are land uses compatible?</label>
            <select className="form-input form-select" style={{ width: "120px" }} value={landUseCompatible} onChange={(e) => setLandUseCompatible(e.target.value)}>
              <option value="Yes">Yes</option>
              <option value="Partially">Partially</option>
              <option value="No">No</option>
            </select>
          </div>

          <div className="form-group" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
            <label className="form-label">Priority Intervention Level</label>
            <select className="form-input form-select" value={priorityLevel} onChange={(e) => setPriorityLevel(e.target.value)}>
              {PRIORITY_LEVELS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Priority Level Explanation</label>
            <input type="text" className="form-input" placeholder="Why is this priority category designated?" value={priorityExplanation} onChange={(e) => setPriorityExplanation(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Recommended Interventions</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "4px 0" }}>
              {INTERVENTIONS.map(i => (
                <button
                  type="button"
                  key={i}
                  onClick={() => toggleListValue(recommendedInterventions, setRecommendedInterventions, i)}
                  className={`btn-select-pill ${recommendedInterventions.includes(i) ? "active" : ""}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Interventions & Execution Notes</label>
            <textarea className="form-input" style={{ height: "50px" }} placeholder="Describe structural works or timelines..." value={interventionNotes} onChange={(e) => setInterventionNotes(e.target.value)} />
          </div>

          <div className="form-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Cost Category</label>
            <select className="form-input form-select" style={{ width: "120px" }} value={costCategory} onChange={(e) => setCostCategory(e.target.value)}>
              {COST_CATEGORIES.map(cc => <option key={cc} value={cc}>{cc}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Additional Observations/Notes</label>
            <textarea className="form-input" style={{ height: "50px" }} placeholder="Veld conditions, slope profiles..." value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
          </div>
        </div>
      )}

      {/* Navigation Wizard Buttons */}
      <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
        {step > 1 && (
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(s => s - 1)}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        
        {step < 4 ? (
          <button 
            className="btn-primary" 
            style={{ flex: 2 }} 
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && (!enumerator || !ward || !village || !gps)}
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn-primary" style={{ flex: 2, background: "linear-gradient(135deg, var(--accent-gold) 0%, #b45309 100%)", color: "#122218", fontWeight: 700 }} onClick={handleSave}>
            <Save size={16} /> {editingDraftId ? "Update Dryland Assessment" : "Save Dryland Assessment"}
          </button>
        )}
      </div>

    </div>
  );
}
