-- Run in Supabase SQL editor AFTER migrations 001, 004, 005, 003 (002 after shapefile load)
-- Expect schema `ldn`

-- 001 code lists
SELECT 'reference_code_lists' AS check_name, count(*)::text AS result
FROM ldn.reference_code_lists;

SELECT list_key, version, status
FROM ldn.reference_code_lists
ORDER BY list_key, version;

-- 004 governance columns (sample — tables must exist from legacy schema)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'ldn'
  AND table_name = 'ldn_validations'
  AND column_name IN (
    'verification_status',
    'reporting_period',
    'data_tier',
    'code_list_version',
    'baseline_period_id'
  )
ORDER BY column_name;

SELECT reporting_period, label, is_active
FROM ldn.reporting_period_config;

-- 005 audit
SELECT count(*) AS verification_log_rows FROM ldn.verification_log;

-- 003 pressure (optional until import)
SELECT count(*) AS pressure_layer_rows FROM ldn.pressure_layers;

-- 002 units (optional until load)
SELECT count(*) AS national_ldn_unit_rows FROM ldn.national_ldn_units;