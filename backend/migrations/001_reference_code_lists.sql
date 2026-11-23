-- Step 1.3 — National code lists (Annex F)
-- Apply in Supabase SQL editor or psql against schema `ldn`

CREATE TABLE IF NOT EXISTS ldn.reference_code_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_key text NOT NULL,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL,
  published_at timestamptz,
  published_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_key, version)
);

CREATE INDEX IF NOT EXISTS idx_code_lists_key ON ldn.reference_code_lists (list_key);

COMMENT ON TABLE ldn.reference_code_lists IS 'Versioned national enumerations; mobile app pins form_version_id to version';

-- Optional: governance columns on field tables (apply when ready)
-- ALTER TABLE ldn.ldn_validations ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'submitted';
-- ALTER TABLE ldn.ldn_validations ADD COLUMN IF NOT EXISTS reporting_period text;
-- ALTER TABLE ldn.ldn_validations ADD COLUMN IF NOT EXISTS data_tier text DEFAULT 'field_verify';
-- ALTER TABLE ldn.ldn_validations ADD COLUMN IF NOT EXISTS code_list_version text;