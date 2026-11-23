/**
 * National code lists bundled with the app (Annex F / Step 1.6).
 */
import codeLists from "../../public/reference-code-lists.v0.9.json";

export const CODE_LIST_VERSION = codeLists.version;

type ListEntry = {
  code: string;
  label: string;
  legacy_codes?: string[];
  legacy_labels?: string[];
};

function valuesOf(key: string): ListEntry[] {
  const lists = (codeLists as { lists: Record<string, { values: ListEntry[] }> }).lists;
  return lists[key]?.values ?? [];
}

function findInList(key: string, codeOrLabel: string): ListEntry | undefined {
  if (!codeOrLabel) return undefined;
  const needle = codeOrLabel.trim().toLowerCase();
  return valuesOf(key).find(
    (v) =>
      v.code.toLowerCase() === needle ||
      v.label.toLowerCase() === needle ||
      v.legacy_codes?.some((c) => c.toLowerCase() === needle) ||
      v.legacy_labels?.some((l) => l.toLowerCase() === needle)
  );
}

export function getLdnSeverityOptions(): string[] {
  return valuesOf("ldn_severity").map((v) => v.label);
}

export function getLdnSeverityCode(value: string): string {
  return findInList("ldn_severity", value)?.code ?? value.toLowerCase();
}

export function getLdnSeverityLabel(value: string): string {
  return findInList("ldn_severity", value)?.label ?? value;
}

export function getLdnLandCoverOptions(): { code: string; label: string }[] {
  return valuesOf("ldn_land_cover_mobile_labels");
}

export function getLdnLandCoverCode(value: string): string {
  return findInList("ldn_land_cover_mobile_labels", value)?.code ?? value;
}

export function getLdnLandCoverLabel(value: string): string {
  return findInList("ldn_land_cover_mobile_labels", value)?.label ?? value;
}

export function getLdnLandUseOptions(): { code: string; label: string }[] {
  return valuesOf("ldn_land_use_type");
}

export function getLdnLandUseCode(value: string): string {
  return findInList("ldn_land_use_type", value)?.code ?? value.toLowerCase();
}

export function getLdnLandUseLabel(value: string): string {
  return findInList("ldn_land_use_type", value)?.label ?? value;
}

export function getSoilTextureOptions(): { code: string; label: string }[] {
  return valuesOf("soil_texture");
}

export function getSoilMoistureOptions(): { code: string; label: string }[] {
  return valuesOf("soil_moisture");
}

export function getSoilMoistureCode(value: string): string {
  return findInList("soil_moisture", value)?.code ?? value.toLowerCase();
}

export function getSoilMoistureLabel(value: string): string {
  return findInList("soil_moisture", value)?.label ?? value;
}

export function getSoilSampleLocationOptions(): { code: string; label: string }[] {
  return valuesOf("soil_sample_location");
}

export function getDrylandsErosionSeverityOptions(): string[] {
  return valuesOf("drylands_erosion_severity").map((v) => v.label);
}

export function getDrylandsErosionSeverityCode(value: string): string {
  return findInList("drylands_erosion_severity", value)?.code ?? value.toLowerCase();
}

export function getDrylandsErosionSeverityLabel(value: string): string {
  return findInList("drylands_erosion_severity", value)?.label ?? value;
}