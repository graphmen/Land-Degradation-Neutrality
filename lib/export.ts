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

export function convertToCSV(records: any[]) {
  if (records.length === 0) return "";

  // Identify all normalized/short keys across all records to omit them.
  // A key 'k' is considered a normalized short key if there is a corresponding
  // nested key in the same record that has a slash and ends with '/' + k.
  // E.g., if record has 'geninfo/dist', then 'dist' is normalized and should be omitted.
  const allExcludedKeys = new Set<string>();
  for (const r of records) {
    const keys = Object.keys(r);
    for (const k of keys) {
      if (k.includes("/") && !k.startsWith("_")) {
        const short = k.split("/").pop()!;
        allExcludedKeys.add(short);
      }
    }
  }

  // Get all unique keys across all records that are not in the excluded set
  const allKeysSet = new Set<string>();
  for (const r of records) {
    for (const k of Object.keys(r)) {
      if (!allExcludedKeys.has(k)) {
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
    
    // Extract coordinates from LDN GPS or Soil poin
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
