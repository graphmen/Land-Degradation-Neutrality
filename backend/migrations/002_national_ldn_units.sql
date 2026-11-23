-- Step 2.1 — National LDN validation polygons (Annex C)
-- Load via ogr2ogr after EMA confirms CRS and area units.

CREATE TABLE IF NOT EXISTS ldn.national_ldn_units (
  id bigserial PRIMARY KEY,
  ldn_unit_id bigint,
  ldn_status_label text CHECK (ldn_status_label IN ('Stable', 'Improved', 'Degraded')),
  area_value double precision,
  area_unit text DEFAULT 'unknown',
  source_object_id bigint,
  dataset_version int NOT NULL DEFAULT 1,
  province text,
  geom geometry(Polygon, 4326)
);

CREATE INDEX IF NOT EXISTS idx_ldn_units_geom ON ldn.national_ldn_units USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ldn_units_status ON ldn.national_ldn_units (ldn_status_label);

COMMENT ON TABLE ldn.national_ldn_units IS 'Combined LDN shapefile — 254k features; join CEID TBD';

-- Example load (run on EMA PostGIS host, paths adjusted):
-- ogr2ogr -f PostgreSQL PG:"..." -nln ldn.national_ldn_units -lco GEOMETRY_NAME=geom \
--   -sql "SELECT Id as ldn_unit_id, LD as ldn_status_label, Area as area_value, * FROM \"Combined ldn shapefiles\"" \
--   "important files/LDN shapefiles/Combined ldn shapefiles.shp"