export function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function convertToKML(features: any[], title: string = "Exported Telemetry Data") {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${title}</name>
    <Folder>
      <name>Points</name>`;

  for (const f of features) {
    const coords = f.geometry.coordinates;
    const props = f.properties;
    const name = props.dist || props.ward || props._mapped_loc || props.samloc || props._id || "Point";
    
    // Build description table
    let desc = '<table border="1" style="border-collapse:collapse;padding:5px;">';
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === "object" || k.startsWith("_mapped_")) continue;
      desc += `<tr><td><b>${k}</b></td><td>${v}</td></tr>`;
    }
    desc += '</table>';

    kml += `
      <Placemark>
        <name>${name}</name>
        <description><![CDATA[${desc}]]></description>
        <Point>
          <coordinates>${coords[0]},${coords[1]},0</coordinates>
        </Point>
      </Placemark>`;
  }

  kml += `
    </Folder>
  </Document>
</kml>`;
  return kml;
}

const SYSTEM_EXCLUDE_KEYS = new Set([
  "start",
  "end",
  "today",
  "deviceid",
  "__version__",
  "uuid",
  "_uuid",
  "_attachments",
  "_status",
  "_geolocation",
  "_submission_time",
  "_validation_status",
  "_submitted_by",
  "_supabase_photos",
  "_xform_id_string",
  "formhub/uuid",
  "meta/instanceID",
  "meta/rootUuid",
  "meta/deprecatedID",
  "raw_data",
  "_localStatus",
  "_mapped_dist",
  "_mapped_tex",
  "_mapped_moist",
  "_mapped_loc",
  "_mapped_col",
  "kobo_id",
  "parent_kobo_id",
  "parent_submission"
]);

function shouldOmitCsvKey(k: string, record: any): boolean {
  if (SYSTEM_EXCLUDE_KEYS.has(k)) return true;
  if (k.startsWith("meta/") || k.startsWith("formhub/")) return true;
  if (k.startsWith("_") && k !== "_id") return true;

  // If a key contains a slash (e.g. geninfo/dist or sampl/tex), check if clean counterpart exists
  if (k.includes("/") && !k.startsWith("_")) {
    const short = k.split("/").pop()!;
    if (record[short] !== undefined || record[short.toLowerCase()] !== undefined) {
      return true;
    }
  }
  return false;
}

export function convertToCSV(records: any[]) {
  if (!records || records.length === 0) return "";

  // Identify clean keys across all records
  const allKeysSet = new Set<string>();
  for (const r of records) {
    if (!r || typeof r !== "object") continue;
    for (const k of Object.keys(r)) {
      if (!shouldOmitCsvKey(k, r)) {
        allKeysSet.add(k);
      }
    }
  }
  const headers = Array.from(allKeysSet);

  // Helper to escape CSV cell value
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return "";
    let str = "";
    if (typeof val === "object") {
      str = JSON.stringify(val);
    } else {
      str = String(val);
    }
    // Escape double quotes by doubling them
    str = str.replace(/"/g, '""');
    // Wrap in quotes if it contains comma, newline, or quotes
    if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(",");
  const rowLines = records.map(r => 
    headers.map(h => escapeCell(r[h])).join(",")
  );

  return [headerLine, ...rowLines].join("\n");
}

export function convertToGeoJSON(records: any[]) {
  const features = records.map(r => {
    let lat = 0;
    let lng = 0;
    
    // Extract coordinates from LDN GPS, Soil poin, or Drylands coordinates
    if (r["geninfo/GPS"] || r.GPS) {
      const gpsStr = r["geninfo/GPS"] || r.GPS || "";
      const parts = gpsStr.split(" ");
      lat = parseFloat(parts[0]) || 0;
      lng = parseFloat(parts[1]) || 0;
    } else if (r["sampl/poin"] || r.poin) {
      const poinStr = r["sampl/poin"] || r.poin || "";
      const parts = poinStr.split(" ");
      lat = parseFloat(parts[0]) || 0;
      lng = parseFloat(parts[1]) || 0;
    } else if (r.coordinates) {
      const parts = String(r.coordinates).trim().split(/\s+/);
      lat = parseFloat(parts[0]) || 0;
      lng = parseFloat(parts[1]) || 0;
    } else if (Array.isArray(r._geolocation) && r._geolocation.length >= 2) {
      lat = parseFloat(r._geolocation[0]) || 0;
      lng = parseFloat(r._geolocation[1]) || 0;
    }

    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat]
      },
      properties: { ...r }
    };
  });

  return {
    type: "FeatureCollection",
    features
  };
}
