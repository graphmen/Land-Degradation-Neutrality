# Import national LDN units (Step 2.1)

**Status:** GIS load blocked until EMA confirms **Area** units and **CEID ↔ shapefile `Id`** join rules.

## Prerequisites

1. Apply `backend/migrations/002_national_ldn_units.sql` on the PostGIS/Supabase project (`ldn` schema).
2. Unzip `important files/LDN shapefiles.zip` locally (combined layer ~254k polygons).
3. Confirm CRS (expect WGS84 or document reprojection to **EPSG:4326**).

## Recommended ogr2ogr (Windows example)

```powershell
$shp = "C:\path\to\Combined ldn shapefiles.shp"
$pg = "PG:host=db.xxx.supabase.co port=5432 dbname=postgres user=postgres password=YOUR_PASSWORD"

ogr2ogr -f PostgreSQL $pg `
  -nln ldn.national_ldn_units `
  -lco GEOMETRY_NAME=geom `
  -t_srs EPSG:4326 `
  -sql "SELECT Id AS ldn_unit_id, LD AS ldn_status_label, Area AS area_value, OBJECTID AS source_object_id FROM \"Combined ldn shapefiles\"" `
  $shp
```

## Post-load checks

```sql
SELECT ldn_status_label, count(*) FROM ldn.national_ldn_units GROUP BY 1;
SELECT count(*) FROM ldn.national_ldn_units WHERE geom IS NULL;
```

## EMA steering questions (see `EMA_STEERING_ONE_PAGER.md`)

- Are `Area` values hectares, m², or another unit?
- Official field for mobile **CE Point ID** linkage (`Id` vs another column)?
- Acceptable simplification tolerance if storing simplified geometries for API?

After confirmation, update `area_unit` on loaded rows and document the dataset version in Annex C.