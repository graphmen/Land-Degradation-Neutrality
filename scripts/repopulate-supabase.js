const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://pqfbcvxisrmtmhmuxbjk.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

async function supabaseFetch(table, rows) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=kobo_id`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
      'Accept-Profile': 'ldn',
      'Content-Profile': 'ldn'
    },
    body: JSON.stringify(rows)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase POST ${table} failed (${res.status}): ${txt}`);
  }
  return res;
}

async function run() {
  console.log('===========================================================');
  console.log('  Repopulating Supabase Tables with Complete Unnested Data ');
  console.log('===========================================================');

  // 1. LDN Validations (150 records)
  const ldnPath = path.join(process.cwd(), 'public', 'ldn-data.json');
  if (fs.existsSync(ldnPath)) {
    const ldnData = JSON.parse(fs.readFileSync(ldnPath, 'utf-8'));
    const records = ldnData.records || [];
    console.log(`\n📋 Processing ${records.length} LDN records...`);

    const rows = records.map(r => {
      const raw = r.raw_data || {};
      const dist = r.district || raw['geninfo/dist'] || raw['dist'] || null;
      const ward = r.ward || raw['geninfo/ward'] || raw['ward'] || null;
      const team = r.team || raw['geninfo/Team'] || raw['Team'] || raw['team'] || null;
      const ceid = r.ceid || raw['geninfo/ceid'] || raw['ceid'] || null;
      const landcov = r.land_cover || raw['poidet/landcov'] || raw['landcov'] || raw['land_cover'] || null;
      const landus = r.land_use || raw['poidet/landus'] || raw['ldi/tree'] || raw['landus'] || raw['land_use'] || null;
      const lndmat = r.matches_baseline || raw['poidet/lndmat'] || raw['lndmat'] || null;
      const vegcov = r.veg_cover || raw['ldi/veg_cov'] || raw['veg_cov'] || null;
      const ero = r.erosion_signs || raw['ldi/signs_ero'] || raw['oth'] || raw['signs_ero'] || null;
      const sev = r.severity || raw['ldi/sev'] || raw['sev'] || null;

      return {
        kobo_id: r.kobo_id || raw._id || r.id,
        uuid: r.uuid || raw._uuid || raw['formhub/uuid'] || null,
        ceid: ceid ? String(ceid) : null,
        province: r.province || raw['prov'] || raw['province'] || null,
        district: dist ? String(dist) : null,
        ward: ward ? String(ward) : null,
        team: team ? String(team) : null,
        lat: r.lat || (raw._geolocation && raw._geolocation[0]) || null,
        lng: r.lng || (raw._geolocation && raw._geolocation[1]) || null,
        altitude: r.altitude || null,
        accuracy: r.accuracy || null,
        land_cover: landcov ? String(landcov) : null,
        land_use: landus ? String(landus) : null,
        matches_baseline: lndmat ? String(lndmat) : null,
        veg_cover: vegcov ? String(vegcov) : null,
        erosion_signs: ero ? String(ero) : null,
        severity: sev ? String(sev) : null,
        raw_data: raw,
        submission_time: r.submission_time || raw._submission_time || null
      };
    });

    try {
      await supabaseFetch('ldn_validations', rows);
      console.log(`✅ Successfully updated ${rows.length} rows in Supabase table ldn_validations!`);
    } catch (e) {
      console.error(`❌ Error inserting into ldn_validations:`, e.message);
    }
  }

  // 2. Drylands Observations (16 records)
  const dryPath = path.join(process.cwd(), 'public', 'drylands-data.json');
  if (fs.existsSync(dryPath)) {
    const dryData = JSON.parse(fs.readFileSync(dryPath, 'utf-8'));
    const records = Array.isArray(dryData) ? dryData : (dryData.records || []);
    console.log(`\n📋 Processing ${records.length} Drylands records...`);

    const rows = records.map(r => {
      const raw = r.raw_data || {};
      const areaType = Array.isArray(r.area_type) ? r.area_type.join(', ') : (r.area_type || raw['area_type'] || null);
      const interventions = Array.isArray(r.recommended_interventions) ? r.recommended_interventions.join(', ') : (r.recommended_interventions || raw['recommended_interventions'] || null);

      return {
        kobo_id: r.kobo_id || raw._id || r.id,
        uuid: r.uuid || raw._uuid || raw['formhub/uuid'] || null,
        enumerator: r.enumerator_name || raw['enumerator_name'] || raw['rm_name'] || null,
        province: r.province || raw['province'] || null,
        district: r.district || raw['district'] || raw['dstct'] || null,
        ward: r.ward_name ? String(r.ward_name) : (raw['ward_name'] || raw['ward'] ? String(raw['ward_name'] || raw['ward']) : null),
        lat: r.lat || (raw._geolocation && raw._geolocation[0]) || null,
        lng: r.lng || (raw._geolocation && raw._geolocation[1]) || null,
        area_type: areaType ? String(areaType) : null,
        dominant_soil: r.dominant_soil_type || raw['dominant_soil_type'] || null,
        dist_river_m: parseFloat(r.distance_to_river || raw['distance_to_river']) || null,
        dist_wetland_m: parseFloat(r.distance_to_wetland || raw['distance_to_wetland']) || null,
        dist_road_m: parseFloat(r.distance_to_road || raw['distance_to_road']) || null,
        interventions: interventions ? String(interventions) : null,
        priority: r.priority_level || raw['priority_level'] || null,
        veg_cover: r.vegetation_condition || raw['vegetation_condition'] || null,
        raw_data: { ...raw, photo_1_url: r.photo_1_url, photo_2_url: r.photo_2_url, photo_3_url: r.photo_3_url },
        submission_time: r.submission_time || raw._submission_time || null
      };
    });

    try {
      await supabaseFetch('drylands_observations', rows);
      console.log(`✅ Successfully updated ${rows.length} rows in Supabase table drylands_observations!`);
    } catch (e) {
      console.error(`❌ Error inserting into drylands_observations:`, e.message);
    }
  }

  // 3. Soil Samples (632 records)
  const soilPath = path.join(process.cwd(), 'public', 'soil-data.json');
  if (fs.existsSync(soilPath)) {
    const soilData = JSON.parse(fs.readFileSync(soilPath, 'utf-8'));
    const records = soilData.records || [];
    console.log(`\n📋 Processing ${records.length} Soil records...`);

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const rows = batch.map(r => {
        const raw = r.raw_data || {};
        return {
          kobo_id: r.kobo_id || raw._id || r.id,
          uuid: r.uuid || raw._uuid || null,
          ceid: r.ceid || raw['geninfo/ceid'] || null,
          province: r.province || raw['prov'] || null,
          district: r.district || raw['geninfo/dist'] || null,
          ward: r.ward ? String(r.ward) : null,
          team: r.team || raw['geninfo/Team'] || null,
          sample_collected: r.sample_collected || raw['sampl/samplecoll'] || null,
          sample_position: r.sample_position || raw['sampl/samloc'] || null,
          lat: r.lat || null,
          lng: r.lng || null,
          depth_cm: r.depth_cm || parseFloat(raw['sampl/dep']) || null,
          moisture: r.moisture || raw['sampl/moisture'] || null,
          munsell_color: r.munsell_color || raw['sampl/col'] || null,
          texture: r.texture || raw['sampl/tex'] || null,
          raw_data: raw,
          submission_time: r.submission_time || raw._submission_time || null
        };
      });

      try {
        await supabaseFetch('soil_samples', rows);
        console.log(`  └ Batch ${Math.floor(i / batchSize) + 1}: ${rows.length} soil rows updated`);
      } catch (e) {
        console.error(`❌ Error inserting soil batch ${i}:`, e.message);
      }
    }
    console.log(`✅ Successfully updated ${records.length} rows in Supabase table soil_samples!`);
  }

  console.log('\n===========================================================');
  console.log('  🎉 SUPABASE REPOPULATION COMPLETE!                       ');
  console.log('===========================================================');
}

run().catch(e => console.error('FATAL:', e));
