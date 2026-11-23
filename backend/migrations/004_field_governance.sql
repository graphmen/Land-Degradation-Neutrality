-- Step 2.4 prep — Phase 1 governance fields on field tables (Annex E §E.4)
-- Apply after 001_reference_code_lists.sql

CREATE TABLE IF NOT EXISTS ldn.reporting_period_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporting_period text NOT NULL UNIQUE,
  label text NOT NULL,
  baseline_period_id text NOT NULL DEFAULT 't0_end_2015',
  baseline_end_year int NOT NULL DEFAULT 2015,
  is_active boolean NOT NULL DEFAULT false,
  prais_due text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ldn.reporting_period_config (
  reporting_period,
  label,
  baseline_period_id,
  baseline_end_year,
  is_active,
  prais_due,
  notes
)
VALUES (
  '2020-2023',
  'PRAIS 4 cycle — rehearsal (draft)',
  't0_end_2015',
  2015,
  true,
  '2026-11',
  'Align with public/reporting-period-config.json until steering signs'
)
ON CONFLICT (reporting_period) DO NOTHING;

-- Shared columns (nullable reporting_period until national assignment)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['ldn_validations', 'soil_samples', 'drylands_observations']
  LOOP
    EXECUTE format(
      'ALTER TABLE ldn.%I ADD COLUMN IF NOT EXISTS verification_status text DEFAULT %L',
      tbl,
      'submitted'
    );
    EXECUTE format('ALTER TABLE ldn.%I ADD COLUMN IF NOT EXISTS reporting_period text', tbl);
    EXECUTE format(
      'ALTER TABLE ldn.%I ADD COLUMN IF NOT EXISTS data_tier text DEFAULT %L',
      tbl,
      'field_verify'
    );
    EXECUTE format('ALTER TABLE ldn.%I ADD COLUMN IF NOT EXISTS code_list_version text', tbl);
    EXECUTE format('ALTER TABLE ldn.%I ADD COLUMN IF NOT EXISTS form_version_id text', tbl);
    EXECUTE format(
      'ALTER TABLE ldn.%I ADD COLUMN IF NOT EXISTS baseline_period_id text DEFAULT %L',
      tbl,
      't0_end_2015'
    );
    EXECUTE format('ALTER TABLE ldn.%I ADD COLUMN IF NOT EXISTS verified_by text', tbl);
    EXECUTE format('ALTER TABLE ldn.%I ADD COLUMN IF NOT EXISTS verified_at timestamptz', tbl);
  END LOOP;
END $$;

COMMENT ON TABLE ldn.reporting_period_config IS 'National reporting period registry; locks reference reporting_period';