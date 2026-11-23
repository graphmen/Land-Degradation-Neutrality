/**
 * National code lists bundled with the app (Annex F / Step 1.6).
 * Source: public/reference-code-lists.v0.9.json — keep in sync with web `public/`.
 */
import codeLists from "../../public/reference-code-lists.v0.9.json";

export const CODE_LIST_VERSION = codeLists.version;

type SeverityEntry = { code: string; label: string; legacy_codes?: string[] };

export function getLdnSeverityOptions(): string[] {
  const list = (codeLists as { lists: { ldn_severity: { values: SeverityEntry[] } } }).lists
    .ldn_severity.values;
  return list.map((v) => v.label);
}

export function getLdnSeverityCode(label: string): string {
  const list = (codeLists as { lists: { ldn_severity: { values: SeverityEntry[] } } }).lists
    .ldn_severity.values;
  const found = list.find((v) => v.label === label);
  return found?.code ?? label.toLowerCase();
}