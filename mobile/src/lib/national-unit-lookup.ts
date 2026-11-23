/** Online CEID check against national LDN unit index (interim rule). */

const apiBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_TELEMETRY_URL ||
  "";

export type CeidLookupResult = {
  match: boolean;
  ld_class?: string;
  polygon_count?: number;
  match_via?: "join_rule" | "alias" | null;
  alias_status?: "pending_ema" | "approved" | "retired" | null;
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
    const aliasStatus = data.alias_status ?? null;
  const matchVia = data.match_via ?? null;

    if (aliasStatus === "retired") {
      return {
        match: false,
        alias_status: "retired",
        message: "Retired CEID — use grid CEID or contact GIS",
      };
    }

    if (!data.match) {
      if (aliasStatus === "pending_ema") {
        return {
          match: false,
          alias_status: "pending_ema",
          message: "Legacy CEID — GIS alias pending; you may still save",
        };
      }
      return {
        match: false,
        message: "No match (interim rule) — confirm with supervisor",
      };
    }

    const u = data.national_unit;
    const aliasNote =
      matchVia === "alias" ? " (alias register)" : "";
    return {
      match: true,
      match_via: matchVia,
      alias_status: aliasStatus,
      ld_class: u?.ld_class,
      polygon_count: u?.polygon_count,
      message: `National LD: ${u?.ld_class ?? "?"} · ${u?.polygon_count ?? 0} polygons${aliasNote}`,
    };
  } catch {
    return { match: false, message: "Lookup failed (offline?)" };
  }
}