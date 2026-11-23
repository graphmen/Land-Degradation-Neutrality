#!/usr/bin/env python3
"""Aggregate public QC + staging JSON into qc-programme-summary.json."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT = PUBLIC / "qc-programme-summary.json"


def load(name: str) -> dict | list | None:
    p = PUBLIC / name
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    ceid = load("qc-ceid-join-report.json") or {}
    pressure_qc = load("qc-pressure-layers-report.json") or {}
    intervention_qc = load("qc-intervention-spatial-report.json") or {}
    rasters = load("qc-national-rasters-report.json") or {}
    pressure_staging = load("pressure-layers-staging.json") or {}
    sbc_staging = load("intervention-sbc-staging.json") or {}
    ema_projects = load("ema-projects-import.json") or {}
    dry_run = load("reporting-desk-dry-run.json") or {}
    aliases = load("reference-ceid-aliases.v0.1.json") or {}

    pressure_pkgs = {
        p.get("layer_id"): p.get("feature_total")
        for p in pressure_qc.get("packages", [])
    }

    intervention_pkgs = {}
    for p in intervention_qc.get("packages", []):
        intervention_pkgs[p.get("layer_id")] = p.get("authoritative_feature_count")

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "field_ldn": {
            "records_with_ceid": ceid.get("field_records_with_ceid"),
            "unique_ceids": ceid.get("unique_ceids"),
            "ceid_join_rule": ceid.get("recommended_interim_rule"),
            "ceid_match_count": ceid.get("match_count_recommended"),
            "ceid_match_rate": ceid.get("match_rate_recommended"),
            "ceid_unmatched_count": ceid.get("unmatched_count"),
            "ceid_alias_pending": (aliases.get("statistics") or {}).get("pending_ema"),
        },
        "national_polygon": {
            "polygon_count": ceid.get("shapefile_profile", {}).get("polygon_count"),
            "unique_unit_ids": ceid.get("shapefile_profile", {}).get("unique_id_count"),
            "area_unit_open": "Q1",
        },
        "pressure_qc_features": pressure_pkgs,
        "pressure_staging_count": pressure_staging.get("count"),
        "intervention_qc_features": intervention_pkgs,
        "staging_counts": {
            "ema_projects": ema_projects.get("count"),
            "sbc": sbc_staging.get("count"),
        },
        "national_rasters": {
            "delivery_ready": [
                L.get("layer_id")
                for L in rasters.get("layers", [])
                if L.get("delivery_ready")
            ],
            "blockers": rasters.get("steering_blockers", []),
        },
        "reporting_gates": dry_run.get("gates"),
        "scripts": [
            "scripts/ceid_join_qc.py",
            "scripts/pressure_layer_qc.py",
            "scripts/intervention_spatial_qc.py",
            "scripts/national_raster_qc.py",
            "scripts/import_pressure_layers.py",
            "scripts/import_sbc_staging.py",
            "scripts/reporting_desk_dry_run.ts",
            "scripts/build_ceid_alias_draft.py",
        ],
        "npm_refresh": "npm run qc:refresh",
        "doc": "LDN Database Princeples/corpus/CORPUS_QC_LINEAGE.md",
    }

    OUT.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"\nWrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())