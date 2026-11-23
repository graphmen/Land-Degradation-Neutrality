/**
 * R1 Evidence registry — unified LDN / soil / drylands read model.
 * Design: LDN Database Princeples/design/R1_EVIDENCE_REGISTRY_API.md
 */

import {
  loadReconciledDrylandsRecords,
  loadReconciledLdnRecords,
  loadReconciledSoilRecords,
} from "@/lib/local-record-reconcile";

export type EvidenceType = "ldn" | "soil" | "drylands";

export type EvidenceRegistryRow = {
  evidence_type: EvidenceType;
  record_id: string;
  uuid: string | null;
  district: string | null;
  ward: string | null;
  ceid: string | null;
  collected_at: string | null;
  lat: number | null;
  lng: number | null;
  data_tier: string | null;
  verification_status: string;
  code_list_version: string | null;
  reporting_period: string | null;
  prais_eligible: boolean;
};

function pickStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function pickNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rowId(r: Record<string, unknown>): string {
  return String(r.kobo_id ?? r.id ?? r._id ?? "");
}

function extractCoords(r: Record<string, unknown>): { lat: number | null; lng: number | null } {
  const latDirect = pickNum(r.lat);
  const lngDirect = pickNum(r.lng);
  if (latDirect != null && lngDirect != null) return { lat: latDirect, lng: lngDirect };

  const geo = r._geolocation;
  if (Array.isArray(geo) && geo.length >= 2) {
    const la = pickNum(geo[0]);
    const ln = pickNum(geo[1]);
    if (la != null && ln != null) return { lat: la, lng: ln };
  }

  // Soil nested sampl/poin format: "-20.525 31.012 771.0 5.0"
  if (Array.isArray(r.sampl) && r.sampl.length > 0) {
    const first = r.sampl[0] as Record<string, unknown>;
    const poin = pickStr(first?.["sampl/poin"] ?? first?.poin);
    if (poin) {
      const parts = poin.trim().split(/\s+/);
      if (parts.length >= 2) {
        const la = pickNum(parts[0]);
        const ln = pickNum(parts[1]);
        if (la != null && ln != null) return { lat: la, lng: ln };
      }
    }
  }

  return { lat: null, lng: null };
}

function toRow(
  r: Record<string, unknown>,
  evidence_type: EvidenceType
): EvidenceRegistryRow {
  const status = pickStr(r.verification_status) ?? "submitted";
  const { lat, lng } = extractCoords(r);
  const district =
    pickStr(r.district) ??
    pickStr(r["geninfo/dist"]) ??
    pickStr(r.dist) ??
    pickStr(r.District) ??
    null;
  const ward =
    pickStr(r.ward) ??
    pickStr(r["geninfo/ward"]) ??
    pickStr(r.ward_name) ??
    pickStr(r.ward_number) ??
    null;
  const ceid =
    pickStr(r.ceid) ??
    pickStr(r["geninfo/ceid"]) ??
    null;

  return {
    evidence_type,
    record_id: rowId(r),
    uuid: pickStr(r.uuid) ?? pickStr(r._uuid),
    district,
    ward,
    ceid,
    collected_at:
      pickStr(r.submission_time) ??
      pickStr(r._submission_time) ??
      pickStr(r["geninfo/measurement_date"]) ??
      pickStr(r.date_of_observation) ??
      pickStr(r.end) ??
      pickStr(r.measurement_date) ??
      null,
    lat,
    lng,
    data_tier: pickStr(r.data_tier),
    verification_status: status,
    code_list_version: pickStr(r.code_list_version),
    reporting_period: pickStr(r.reporting_period),
    prais_eligible: status === "locked",
  };
}

export type EvidenceRegistryQuery = {
  type?: EvidenceType | null;
  verification_status?: string | null;
  prais_eligible?: boolean;
  limit?: number;
  offset?: number;
};

export type EvidenceRegistryPackage = {
  module_id: "evidence-registry";
  r2_preview: true;
  generated_at: string;
  counts: { ldn: number; soil: number; drylands: number; returned: number };
  records: EvidenceRegistryRow[];
  filters_applied: EvidenceRegistryQuery;
};

export async function buildEvidenceRegistry(
  query: EvidenceRegistryQuery = {}
): Promise<EvidenceRegistryPackage> {
  const limit = Math.min(query.limit ?? 500, 2000);
  const offset = query.offset ?? 0;

  const [ldn, soil, drylands] = await Promise.all([
    loadReconciledLdnRecords(),
    loadReconciledSoilRecords(),
    loadReconciledDrylandsRecords(),
  ]);

  let rows: EvidenceRegistryRow[] = [];
  if (!query.type || query.type === "ldn") {
    rows = rows.concat(ldn.map((r) => toRow(r, "ldn")));
  }
  if (!query.type || query.type === "soil") {
    rows = rows.concat(soil.map((r) => toRow(r, "soil")));
  }
  if (!query.type || query.type === "drylands") {
    rows = rows.concat(drylands.map((r) => toRow(r, "drylands")));
  }

  if (query.verification_status) {
    rows = rows.filter((r) => r.verification_status === query.verification_status);
  }
  if (query.prais_eligible) {
    rows = rows.filter((r) => r.prais_eligible);
  }

  const returned = rows.slice(offset, offset + limit);

  return {
    module_id: "evidence-registry",
    r2_preview: true,
    generated_at: new Date().toISOString(),
    counts: {
      ldn: ldn.length,
      soil: soil.length,
      drylands: drylands.length,
      returned: returned.length,
    },
    records: returned,
    filters_applied: { ...query, limit, offset },
  };
}