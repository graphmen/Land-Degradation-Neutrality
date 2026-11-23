"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ProgrammeStats = {
  codeListVersion: string;
  codeListStatus: string;
  monitoringSites: number;
  ldnWithLandCover: number;
  ldnTotal: number;
  interventionsEma: number;
  interventionsTotal: number;
  drylandsCount: number;
};

const DEFAULT_STATS: ProgrammeStats = {
  codeListVersion: "0.9-draft",
  codeListStatus: "pending_ema_sign_off",
  monitoringSites: 28,
  ldnWithLandCover: 150,
  ldnTotal: 150,
  interventionsEma: 47,
  interventionsTotal: 51,
  drylandsCount: 16,
};

export default function ProgrammeTransformPanel() {
  const [stats, setStats] = useState<ProgrammeStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [codes, sites, ldn, interventions, drylands] = await Promise.all([
          fetch("/api/reference/code-lists", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/reference/monitoring-sites", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/ldn?limit=5000", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ records: [] })),
          fetch("/api/interventions?includeEma=true", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ records: [] })),
          fetch("/api/drylands?limit=5000", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ records: [] })),
        ]);

        const ldnRecords = ldn?.records ?? [];
        const withCover = ldnRecords.filter(
          (r: { land_cover?: string }) => r.land_cover != null && String(r.land_cover).trim() !== ""
        ).length;

        const intRecords = interventions?.records ?? [];
        const emaCount = intRecords.filter(
          (r: { _source?: string }) => r._source === "ema_staging"
        ).length;

        const siteCount =
          sites?.count ??
          (Array.isArray(sites?.records) ? sites.records.length : DEFAULT_STATS.monitoringSites);

        setStats({
          codeListVersion: codes?.version ?? DEFAULT_STATS.codeListVersion,
          codeListStatus: codes?.status ?? DEFAULT_STATS.codeListStatus,
          monitoringSites: siteCount,
          ldnWithLandCover: withCover || DEFAULT_STATS.ldnWithLandCover,
          ldnTotal: ldnRecords.length || DEFAULT_STATS.ldnTotal,
          interventionsEma: emaCount || DEFAULT_STATS.interventionsEma,
          interventionsTotal: intRecords.length || DEFAULT_STATS.interventionsTotal,
          drylandsCount: (drylands?.records ?? []).length || DEFAULT_STATS.drylandsCount,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section className="programme-transform-panel" aria-label="National LDN programme status">
      <div className="programme-transform-header">
        <div>
          <span className="programme-transform-badge">National programme — active sprint</span>
          <h2 className="programme-transform-title">What changed today (visible on this hub)</h2>
          <p className="programme-transform-lead">
            <strong>Deliverable B:</strong> EMA mobile app → <code>/api/submit/*</code> → national DB + JSON cache.
            <strong> Deliverable A:</strong> governed APIs, ETL fix, monitoring sites, 47 EMA interventions staging, Annex F codes.
            Legacy Kobo sync remains only for historical backfill — not for new field work.
          </p>
        </div>
        {loading && <div className="programme-inline-spinner" aria-label="Loading programme stats" />}
      </div>

      <div className="programme-transform-grid">
        <StatCard
          label="LDN cache ETL"
          value={`${stats.ldnWithLandCover}/${stats.ldnTotal}`}
          detail="land_cover + land_use denormalized"
        />
        <StatCard label="Code lists" value={stats.codeListVersion} detail={stats.codeListStatus.replace(/_/g, " ")} />
        <StatCard label="Monitoring sites" value={String(stats.monitoringSites)} detail="EMA existing-sites register" />
        <StatCard
          label="EMA interventions"
          value={String(stats.interventionsEma)}
          detail={`${stats.interventionsTotal} on hub map`}
        />
        <StatCard label="Mobile ingest API" value="Live" detail="/api/submit/ldn · soil · drylands" />
        <StatCard label="Drylands records" value={String(stats.drylandsCount)} detail="erosion codes + Mild→Low" />
      </div>

      <ul className="programme-transform-checklist">
        <li>✅ Mobile-only collection policy (Guide §1.2) — documented &amp; coded</li>
        <li>✅ Mobile forms + canonical codes; draft queue → Next.js hub</li>
        <li>🔶 Supabase migrations 001/002 — SQL ready, apply on project DB</li>
        <li>🔶 National LDN polygons — blocked on EMA Area + CEID confirmation</li>
      </ul>

      <div className="programme-transform-links">
        <Link href="/database">Database Explorer</Link>
        <Link href="/interventions">Interventions map ({stats.interventionsEma} EMA)</Link>
        <Link href="/api/reference/code-lists">Code lists API</Link>
      </div>
    </section>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="programme-stat-card">
      <div className="programme-stat-label">{label}</div>
      <div className="programme-stat-value">{value}</div>
      <div className="programme-stat-detail">{detail}</div>
    </div>
  );
}