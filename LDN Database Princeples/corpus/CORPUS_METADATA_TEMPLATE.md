# Corpus layer — PRAIS Annex II metadata template

Copy this block for **each** row in [`CORPUS_METADATA_REGISTER.md`](./CORPUS_METADATA_REGISTER.md) before PostGIS load.

```yaml
layer_id: LDN-NAT-ALL                    # registry ID
title: ""                                  # human title
abstract: ""                               # 1–2 sentences
custodian: Environmental Management Agency
contact: ""                                # reporting officer / GIS lead email

vintage: ""                                # e.g. 2026-11 or survey year
source_file: ""                            # basename in important files/
dataset_version: 1
imported_at: ""                            # ISO8601 after load
imported_by: ""                            # role + name

geometry_type: Point | Polygon | ...
feature_count: 0
crs: EPSG:4326                             # storage CRS
original_crs: ""                           # if reprojected

licence: government_internal | public | restricted
sensitivity: public | district | national_only
lineage: ""                                # derived from / workshop / field

so_uses:                                   # reporting links
  - SO1-1
data_tier: tier1_default | tier2_national | tier3_research | field_verify
reporting_period: null                     # until assigned
confidence: high | medium | low

# PRAIS Annex II (when dataset replaces default in SO1)
prais_alternative_dataset:
  title: ""
  source_link_or_doi: ""
  author_publisher: ""
  bibliographic_citation: ""
```

## Field notes

| Field | PRAIS / GPG |
|-------|-------------|
| `title` | Annex II — dataset title |
| `source_link_or_doi` | URL or DOI of national dataset |
| `author_publisher` | EMA or named institute |
| `bibliographic_citation` | Full reference for national report annex |

## Example (partial) — REF-SITES

```yaml
layer_id: REF-SITES
title: EMA existing monitoring sites (latest register)
custodian: EMA
vintage: 2026-11
source_file: Final Existing sites latest.xls
feature_count: 28
crs: EPSG:4326
data_tier: field_verify
confidence: medium
so_uses: []
```

Steering fills `prais_alternative_dataset` only for layers that **replace** PRAIS default data in SO1.