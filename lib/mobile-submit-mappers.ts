/**
 * Map mobile IndexedDB drafts → Supabase rows + local cache records (Step 2.3).
 */

export type MobileLdnDraft = {
  id: string;
  measurement_date?: string;
  dist: string;
  ward?: string;
  Team: string;
  GPS: string;
  ceid: string;
  landcov: string;
  landus: string;
  use_spec?: string;
  lndmat?: string;
  ex_mism?: string;
  veg_cov?: string;
  signs_ero?: string[];
  tree?: string[];
  sev?: string;
  oth?: string;
  im?: string;
  code_list_version?: string;
};

export type MobileSoilCore = {
  samloc: string;
  poin: string;
  dep: number;
  moisture?: string;
  col?: string;
  tex: string;
};

export type MobileSoilDraft = {
  id: string;
  measurement_date?: string;
  dist: string;
  ward?: string;
  Team: string;
  ceid: string;
  cores: MobileSoilCore[];
  code_list_version?: string;
};

export type MobileDrylandsDraft = Record<string, unknown> & {
  id: string;
  code_list_version?: string;
};

function parseGps(gps: string) {
  const parts = (gps || "").trim().split(/\s+/);
  return {
    lat: parts[0] ? parseFloat(parts[0]) : null,
    lng: parts[1] ? parseFloat(parts[1]) : null,
    altitude: parts[2] ? parseFloat(parts[2]) : null,
    accuracy: parts[3] ? parseFloat(parts[3]) : null,
  };
}

export function buildLdnFromMobileDraft(draft: MobileLdnDraft) {
  const numericId = Math.floor(Math.random() * 900000000) + 100000000;
  const submissionTime = new Date().toISOString();
  const { lat, lng, altitude, accuracy } = parseGps(draft.GPS);
  const signs = draft.signs_ero?.length ? draft.signs_ero.join(" ") : null;

  const raw_data: Record<string, unknown> = {
    _id: numericId,
    _submission_time: submissionTime,
    _status: "submitted_via_mobile",
    _source: "ema_mobile_app",
    mobile_draft_id: draft.id,
    code_list_version: draft.code_list_version,
    "geninfo/dist": draft.dist,
    "geninfo/ward": draft.ward,
    "geninfo/Team": draft.Team,
    "geninfo/GPS": draft.GPS,
    "geninfo/ceid": draft.ceid,
    "poidet/landcov": draft.landcov,
    "poidet/landus": draft.landus,
    "poidet/use_spec": draft.use_spec,
    "poidet/lndmat": draft.lndmat,
    "poidet/ex_mism": draft.ex_mism,
    "ldi/veg_cov": draft.veg_cov,
    "ldi/signs_ero": signs,
    "ldi/tree": draft.tree,
    "ldi/sev": draft.sev,
    oth: draft.oth,
    landcov: draft.landcov,
    landus: draft.landus,
    lndmat: draft.lndmat,
    veg_cov: draft.veg_cov,
    signs_ero: draft.signs_ero,
    sev: draft.sev,
    dist: draft.dist,
    ward: draft.ward,
    Team: draft.Team,
    GPS: draft.GPS,
    ceid: draft.ceid,
    _geolocation: lat != null && lng != null ? [lat, lng] : undefined,
  };

  const cacheRecord = {
    ...raw_data,
    _id: numericId,
    raw_data,
    land_cover: draft.landcov,
    land_use: draft.landus,
    matches_baseline: draft.lndmat,
    veg_cover: draft.veg_cov,
    erosion_signs: signs,
    severity: draft.sev,
    district: draft.dist,
    ward: draft.ward,
    team: draft.Team,
    lat,
    lng,
    altitude,
    accuracy,
    verification_status: "submitted",
    code_list_version: draft.code_list_version,
  };

  const supabaseRow = {
    kobo_id: String(numericId),
    ceid: draft.ceid,
    district: draft.dist,
    ward: draft.ward ?? null,
    team: draft.Team,
    lat,
    lng,
    altitude,
    accuracy,
    land_cover: draft.landcov,
    land_use: draft.landus,
    matches_baseline: draft.lndmat ?? null,
    veg_cover: draft.veg_cov ?? null,
    erosion_signs: signs,
    severity: draft.sev ?? null,
    raw_data,
    submission_time: submissionTime,
    verification_status: "submitted",
    code_list_version: draft.code_list_version ?? null,
  };

  return { cacheRecord, supabaseRow, koboId: String(numericId) };
}

export function buildSoilRowsFromMobileDraft(draft: MobileSoilDraft) {
  const submissionTime = new Date().toISOString();
  const cacheRecords: Record<string, unknown>[] = [];
  const supabaseRows: Record<string, unknown>[] = [];

  draft.cores.forEach((core, index) => {
    const numericId = Math.floor(Math.random() * 900000000) + 100000000;
    const { lat, lng } = parseGps(core.poin);
    const raw_data: Record<string, unknown> = {
      _id: numericId,
      _submission_time: submissionTime,
      _status: "submitted_via_mobile",
      mobile_draft_id: draft.id,
      mobile_core_index: index,
      code_list_version: draft.code_list_version,
      "geninfo/dist": draft.dist,
      "geninfo/ward": draft.ward,
      "geninfo/Team": draft.Team,
      "geninfo/ceid": draft.ceid,
      "sampl/samloc": core.samloc,
      "sampl/dep": core.dep,
      "sampl/moisture": core.moisture,
      "sampl/col": core.col,
      "sampl/tex": core.tex,
      samloc: core.samloc,
      dep: core.dep,
      moisture: core.moisture,
      col: core.col,
      tex: core.tex,
      dist: draft.dist,
      ward: draft.ward,
      Team: draft.Team,
      ceid: draft.ceid,
      _geolocation: lat != null && lng != null ? [lat, lng] : undefined,
    };

    cacheRecords.push({
      ...raw_data,
      raw_data,
      district: draft.dist,
      ward: draft.ward,
      team: draft.Team,
      ceid: draft.ceid,
      lat,
      lng,
      depth_cm: core.dep,
      moisture: core.moisture,
      munsell_color: core.col,
      texture: core.tex,
      sample_position: core.samloc,
    });

    supabaseRows.push({
      kobo_id: String(numericId),
      ceid: draft.ceid,
      district: draft.dist,
      ward: draft.ward ?? null,
      team: draft.Team,
      sample_position: core.samloc,
      lat,
      lng,
      depth_cm: core.dep,
      moisture: core.moisture ?? null,
      munsell_color: core.col ?? null,
      texture: core.tex,
      raw_data,
      submission_time: submissionTime,
      code_list_version: draft.code_list_version ?? null,
    });
  });

  return { cacheRecords, supabaseRows };
}

export function buildDrylandsFromMobileDraft(draft: MobileDrylandsDraft) {
  const numericId = Math.floor(Math.random() * 900000000) + 100000000;
  const submissionTime = new Date().toISOString();
  const coords = String(draft.coordinates || "");
  const { lat, lng } = parseGps(coords);

  const raw_data = {
    ...draft,
    _id: numericId,
    _submission_time: submissionTime,
    _status: "submitted_via_mobile",
    _source: "ema_mobile_app",
    mobile_draft_id: draft.id,
    _geolocation: lat != null && lng != null ? [lat, lng] : undefined,
  };

  const areaType = Array.isArray(draft.area_type)
    ? (draft.area_type as string[]).join(", ")
  : (draft.area_type as string) || null;

  const cacheRecord = {
    ...raw_data,
    _id: numericId,
    raw_data,
    lat,
    lng,
    enumerator_name: draft.enumerator_name,
    ward_name: draft.ward_name,
    erosion_severity: draft.erosion_severity,
    verification_status: "submitted",
  };

  const supabaseRow = {
    kobo_id: String(numericId),
    enumerator: draft.enumerator_name ?? null,
    ward: draft.ward_name != null ? String(draft.ward_name) : null,
    lat,
    lng,
    area_type: areaType,
    vegetation_condition: draft.vegetation_condition ?? null,
    erosion_severity: draft.erosion_severity ?? null,
    raw_data,
    submission_time: submissionTime,
    code_list_version: draft.code_list_version ?? null,
    verification_status: "submitted",
  };

  return { cacheRecord, supabaseRow, koboId: String(numericId) };
}