-- Step 2.x — National pressure / threat point layers (Annex C INT-SBC, PRESS-*)
-- Apply after EMA access policy + attribute dictionaries signed.

CREATE TABLE IF NOT EXISTS ldn.pressure_layers (
  id bigserial PRIMARY KEY,
  layer_id text NOT NULL,
  theme text NOT NULL,
  source_file text,
  dataset_version int NOT NULL DEFAULT 1,
  lat double precision,
  lng double precision,
  geom geometry(Point, 4326),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitivity text NOT NULL DEFAULT 'restricted',
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by text
);

CREATE INDEX IF NOT EXISTS idx_pressure_layers_theme ON ldn.pressure_layers (theme);
CREATE INDEX IF NOT EXISTS idx_pressure_layers_geom ON ldn.pressure_layers USING GIST (geom);

COMMENT ON TABLE ldn.pressure_layers IS 'EMA pressure layers — mining, invasives, etc.; see corpus/metadata/*_IMPORT_PLAN.md';

-- verification_log stub (Verification workspace)
CREATE TABLE IF NOT EXISTS ldn.verification_log (
  id bigserial PRIMARY KEY,
  record_type text NOT NULL,
  record_id text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  actor_id text,
  actor_role text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_log_record ON ldn.verification_log (record_type, record_id);