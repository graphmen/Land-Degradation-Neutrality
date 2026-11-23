#!/usr/bin/env python3
"""
UNCCD SDG 15.3.1 (SO1) Zonal Statistics & One-Out-All-Out (1OAO) Engine.

Supports two authoritative national workflows:
  1. Direct GeoTIFF raster computation from `important files/`:
       - lc-national-t0.tif     (UNCCD 7-class: 1..7)
       - lc-national-t1.tif     (UNCCD 7-class: 1..7)
       - lpd-national.tif       (LPD: 1=declining, 2=stable, 3=increasing, 0/4=not_assessed)
       - soc-national-0-30.tif  (SOC stock t/ha or % 0-30cm)
  2. Trends.Earth QGIS summary JSON import:
       python scripts/compute_so1_zonal_1oao.py --trends-earth path/to/summary.json

Writes canonical `public/so1-zonal-computed.json`, which is automatically consumed by:
  - /api/export/so1-lc
  - /api/export/so1-lpd
  - /api/export/so1-soc
  - /api/export/so1-status
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMPORTANT_DIR = ROOT / "important files"
OUT_PATH = ROOT / "public" / "so1-zonal-computed.json"

UNCCD_CODE_MAP = {
    1: "tree_covered",
    2: "grassland",
    3: "cropland",
    4: "wetland",
    5: "artificial",
    6: "other_land",
    7: "water",
}

# UNCCD GPG SDG 15.3.1 v2 default degradation transitions (-1 = degraded, 0 = stable, 1 = improved)
LC_DEGRADED_PAIRS = {
    (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
    (2, 4), (2, 5), (2, 6),
    (3, 2), (3, 4), (3, 5), (3, 6),
    (4, 1), (4, 2), (4, 3), (4, 5), (4, 6),
    (6, 5),
}


def compute_from_geotiffs(period: str) -> dict:
    lc0 = IMPORTANT_DIR / "lc-national-t0.tif"
    lc1 = IMPORTANT_DIR / "lc-national-t1.tif"
    lpd = IMPORTANT_DIR / "lpd-national.tif"
    soc = IMPORTANT_DIR / "soc-national-0-30.tif"

    present = {
        "lc_t0": lc0.exists(),
        "lc_t1": lc1.exists(),
        "lpd": lpd.exists(),
        "soc": soc.exists(),
    }

    if not any(present.values()):
        return {
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "status": "awaiting_rasters",
            "reporting_period": period,
            "one_ao_ready": False,
            "rasters_present": present,
            "note": (
                "Drop lc-national-t0.tif, lc-national-t1.tif, lpd-national.tif, and "
                "soc-national-0-30.tif into 'important files/' or pass --trends-earth <summary.json>."
            ),
            "lc_transitions": [],
            "lpd_classes": [],
            "soc_tier1": None,
            "one_ao": None,
        }

    try:
        import numpy as np
        import rasterio
    except ImportError as exc:
        raise SystemExit(
            "GeoTIFF files detected, but rasterio/numpy are not installed. "
            "Install with: pip install rasterio numpy"
        ) from exc

    lc_transitions: list[dict] = []
    lpd_classes: list[dict] = []
    soc_tier1: dict | None = None
    one_ao: dict | None = None

    lc_deg_mask = None
    lpd_deg_mask = None
    valid_mask = None
    pixel_area_km2 = 0.0

    if lc0.exists() and lc1.exists():
        with rasterio.open(lc0) as s0, rasterio.open(lc1) as s1:
            a0 = s0.read(1)
            a1 = s1.read(1)
            # Approximate pixel area in km² at Zimbabwe mean latitude (-19°)
            res_x, res_y = s0.res
            if s0.crs and s0.crs.is_geographic:
                pixel_area_km2 = abs(res_x * 111.32 * 0.9455) * abs(res_y * 110.57)
            else:
                pixel_area_km2 = abs(res_x * res_y) / 1_000_000.0

            valid_mask = (a0 >= 1) & (a0 <= 7) & (a1 >= 1) & (a1 <= 7)
            lc_deg_mask = np.zeros_like(valid_mask, dtype=bool)

            for f_code, f_name in UNCCD_CODE_MAP.items():
                for t_code, t_name in UNCCD_CODE_MAP.items():
                    m = (a0 == f_code) & (a1 == t_code)
                    cnt = int(np.count_nonzero(m))
                    lc_transitions.append(
                        {
                            "from_unccd_class": f_name,
                            "to_unccd_class": t_name,
                            "area_km2": round(cnt * pixel_area_km2, 3),
                        }
                    )
                    if (f_code, t_code) in LC_DEGRADED_PAIRS:
                        lc_deg_mask |= m

    if lpd.exists():
        with rasterio.open(lpd) as sl:
            al = sl.read(1)
            res_x, res_y = sl.res
            lpd_px_km2 = (
                abs(res_x * 111.32 * 0.9455) * abs(res_y * 110.57)
                if (sl.crs and sl.crs.is_geographic)
                else abs(res_x * res_y) / 1_000_000.0
            )
            lpd_map = {1: "declining", 2: "stable", 3: "increasing", 4: "not_assessed"}
            counts = {name: int(np.count_nonzero(al == code)) for code, name in lpd_map.items()}
            total_lpd = sum(counts.values()) or 1
            for name, cnt in counts.items():
                lpd_classes.append(
                    {
                        "lpd_class": name,
                        "area_km2": round(cnt * lpd_px_km2, 3),
                        "area_percent": round((cnt / total_lpd) * 100.0, 2),
                    }
                )
            if valid_mask is not None and al.shape == valid_mask.shape:
                lpd_deg_mask = al == 1

    if soc.exists():
        with rasterio.open(soc) as ss:
            asoc = ss.read(1).astype("float64")
            nodata = ss.nodata
            valid_soc = np.isfinite(asoc) & (asoc > 0)
            if nodata is not None:
                valid_soc &= asoc != nodata
            res_x, res_y = ss.res
            soc_px_km2 = (
                abs(res_x * 111.32 * 0.9455) * abs(res_y * 110.57)
                if (ss.crs and ss.crs.is_geographic)
                else abs(res_x * res_y) / 1_000_000.0
            )
            area_km2 = float(np.count_nonzero(valid_soc)) * soc_px_km2
            mean_t_ha = float(np.mean(asoc[valid_soc])) if np.any(valid_soc) else 0.0
            soc_tier1 = {
                "area_km2": round(area_km2, 2),
                "mean_t_ha": round(mean_t_ha, 2),
                "stock_tonnes": round(area_km2 * 100.0 * mean_t_ha, 1),
            }

    if valid_mask is not None and lc_deg_mask is not None and lpd_deg_mask is not None:
        combined_deg = valid_mask & (lc_deg_mask | lpd_deg_mask)
        total_valid = int(np.count_nonzero(valid_mask)) or 1
        deg_cnt = int(np.count_nonzero(combined_deg))
        one_ao = {
            "degraded_area_km2": round(deg_cnt * pixel_area_km2, 2),
            "total_assessed_km2": round(total_valid * pixel_area_km2, 2),
            "degraded_area_percent": round((deg_cnt / total_valid) * 100.0, 4),
            "method": "UNCCD GPG v2 One-Out-All-Out (1OAO)",
        }

    return {
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "status": "computed" if one_ao else "partial",
        "reporting_period": period,
        "one_ao_ready": one_ao is not None,
        "rasters_present": present,
        "lc_transitions": lc_transitions,
        "lpd_classes": lpd_classes,
        "soc_tier1": soc_tier1,
        "one_ao": one_ao,
    }


def import_trends_earth_json(te_path: Path, period: str) -> dict:
    with open(te_path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return {
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "status": "computed",
        "source": f"Trends.Earth ({te_path.name})",
        "reporting_period": period,
        "one_ao_ready": bool(raw.get("one_ao")),
        "lc_transitions": raw.get("lc_transitions", []),
        "lpd_classes": raw.get("lpd_classes", []),
        "soc_tier1": raw.get("soc_tier1"),
        "one_ao": raw.get("one_ao"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute SO1 zonal stats & 1OAO from national rasters")
    parser.add_argument("--period", default="2020-2023")
    parser.add_argument("--trends-earth", type=str, default=None, help="Path to Trends.Earth summary JSON")
    args = parser.parse_args()

    if args.trends_earth:
        payload = import_trends_earth_json(Path(args.trends_earth), args.period)
    else:
        payload = compute_from_geotiffs(args.period)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(
        f"SO1 zonal engine finished: status={payload['status']} "
        f"one_ao_ready={payload['one_ao_ready']} -> {OUT_PATH.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
