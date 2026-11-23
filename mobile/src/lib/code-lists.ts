/**
 * National code lists bundled with the app (Annex F / Step 1.6).
 */
import codeLists from "../../public/reference-code-lists.v0.9.json";

export const CODE_LIST_VERSION = codeLists.version;

type ListEntry = { code: string; label: string; legacy_codes?: string[]; legacy_labels?: string[] };

function valuesOf(key: string): ListEntry[] {
  const lists = (codeLists as { lists: Record<string, { values: ListEntry[] }> }).lists;
  return lists[key]?.values ?? [];
}

export function getLdnSeverityOptions(): string[] {
  return valuesOf("ldn_severity").map((v) => v.label);
}

export function getLdnSeverityCode(label: string): string {
  const found = valuesOf("ldn_severity").find((v) => v.label === label);
  return found?.code ?? label.toLowerCase();
}

export function getLdnLandCoverOptions(): { code: string; label: string }[] {
  return valuesOf("ldn_land_cover_mobile_labels");
}

export function getSoilTextureOptions(): { code: string; label: string }[] {
  return valuesOf("soil_texture");
}

export function getSoilMoistureOptions(): string[] {
  return valuesOf("soil_moisture").map((v) => v.label);
}

export function getSoilSampleLocationOptions(): { code: string; label: string }[] {
  return valuesOf("soil_sample_location");
}

export function getDrylandsErosionSeverityOptions(): string[] {
  return valuesOf("drylands_erosion_severity").map((v) => v.label);
}