/**
 * Canonical LDN field extraction for cache + Supabase (Annex A / Step 1.4).
 * @param {object} record — row from public/ldn-data.json
 * @returns {object} denormalized fields
 */
function extractLdnFields(record) {
  const raw = record.raw_data && typeof record.raw_data === "object" ? record.raw_data : {};
  const merged = { ...raw, ...record };

  const dist =
    merged.district || raw["geninfo/dist"] || raw.dist || merged.dist || null;
  const ward = merged.ward || raw["geninfo/ward"] || raw.ward || null;
  const team =
    merged.team || raw["geninfo/Team"] || raw.Team || raw.team || null;
  const ceid = merged.ceid || raw["geninfo/ceid"] || raw.ceid || null;

  const land_cover =
    merged.land_cover ||
    raw["poidet/landcov"] ||
    raw.landcov ||
    merged.landcov ||
    null;

  const land_use =
    merged.land_use ||
    raw["poidet/landus"] ||
    raw.landus ||
    merged.landus ||
    null;

  const matches_baseline =
    merged.matches_baseline ||
    raw["poidet/lndmat"] ||
    raw.lndmat ||
    null;

  const veg_cover =
    merged.veg_cover || raw["ldi/veg_cov"] || raw.veg_cov || null;

  const erosion_signs =
    merged.erosion_signs || raw["ldi/signs_ero"] || raw.signs_ero || null;

  const severity = merged.severity || raw["ldi/sev"] || raw.sev || null;

  let lat = merged.lat ?? null;
  let lng = merged.lng ?? null;
  const geo = raw._geolocation;
  if ((lat == null || lng == null) && Array.isArray(geo) && geo.length >= 2) {
    lat = geo[0];
    lng = geo[1];
  }
  const gps = raw["geninfo/GPS"] || raw.GPS;
  if ((lat == null || lng == null) && typeof gps === "string") {
    const parts = gps.trim().split(/\s+/);
    if (parts.length >= 2) {
      lat = parseFloat(parts[0]);
      lng = parseFloat(parts[1]);
    }
  }

  const submission_id = merged.kobo_id || merged.id || raw._id || null;
  const uuid = merged.uuid || raw._uuid || null;
  const submission_time =
    merged.submission_time || raw._submission_time || null;

  return {
    kobo_id: submission_id != null ? String(submission_id) : null,
    id: submission_id,
    uuid,
    ceid: ceid != null ? String(ceid) : null,
    province: merged.province || raw.prov || raw.province || null,
    district: dist != null ? String(dist) : null,
    ward: ward != null ? String(ward) : null,
    team: team != null ? String(team) : null,
    lat: lat != null && !Number.isNaN(Number(lat)) ? Number(lat) : null,
    lng: lng != null && !Number.isNaN(Number(lng)) ? Number(lng) : null,
    altitude: merged.altitude ?? null,
    accuracy: merged.accuracy ?? null,
    land_cover: land_cover != null ? String(land_cover) : null,
    land_use: land_use != null ? String(land_use) : null,
    matches_baseline: matches_baseline != null ? String(matches_baseline) : null,
    veg_cover: veg_cover != null ? String(veg_cover) : null,
    erosion_signs: erosion_signs != null ? String(erosion_signs) : null,
    severity: severity != null ? String(severity) : null,
    submission_time,
  };
}

function flattenLdnRecord(record) {
  const fields = extractLdnFields(record);
  const raw =
    record.raw_data && typeof record.raw_data === "object"
      ? record.raw_data
      : record.raw_data || record;
  return {
    ...record,
    ...fields,
    raw_data: typeof raw === "object" ? raw : record.raw_data,
  };
}

module.exports = { extractLdnFields, flattenLdnRecord };