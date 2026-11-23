/** Online CEID check against national LDN unit index (interim rule). */

const apiBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_TELEMETRY_URL ||
  "";

export type CeidLookupResult = {
  match: boolean;
  ld_class?: string;
  polygon_count?: number;
  message: string;
};

export async function lookupNationalUnitByCeid(
  ceid: string
): Promise<CeidLookupResult | null> {
  const trimmed = ceid.trim();
  if (!trimmed || !apiBase) {
    return {
      match: false,
      message: apiBase
        ? "Enter CEID to check"
        : "Set VITE_API_BASE_URL to enable national unit lookup",
    };
  }

  try {
    const res = await fetch(
      `${apiBase.replace(/\/$/, "")}/api/validator/ceid?ceid=${encodeURIComponent(trimmed)}`
    );
    const data = await res.json();
    if (!data.match) {
      return {
        match: false,
        message: "No match (interim rule) — confirm with supervisor",
      };
    }
    const u = data.national_unit;
    return {
      match: true,
      ld_class: u?.ld_class,
      polygon_count: u?.polygon_count,
      message: `National LD: ${u?.ld_class ?? "?"} · ${u?.polygon_count ?? 0} polygons`,
    };
  } catch {
    return { match: false, message: "Lookup failed (offline?)" };
  }
}