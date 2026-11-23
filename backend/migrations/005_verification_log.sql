-- Step 2.4 Phase 2 — verification audit log (Annex E §E.2)
-- If applied after 003, this upgrades the stub table; safe to run standalone.

CREATE TABLE IF NOT EXISTS ldn.verification_log (
  id bigserial PRIMARY KEY,
  record_type text NOT NULL,
  record_id text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  actor_id text NOT NULL,
  actor_role text,
  reporting_period text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ldn.verification_log ADD COLUMN IF NOT EXISTS reporting_period text;
ALTER TABLE ldn.verification_log ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 003 stub allowed null actor_id; tighten only on new installs via application layer
ALTER TABLE ldn.verification_log ADD COLUMN IF NOT EXISTS actor_id text;
ALTER TABLE ldn.verification_log ADD COLUMN IF NOT EXISTS actor_role text;

CREATE INDEX IF NOT EXISTS idx_verification_log_record ON ldn.verification_log (record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_created ON ldn.verification_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_log_to_status ON ldn.verification_log (to_status);

COMMENT ON TABLE ldn.verification_log IS 'Append-only verification transitions; see GOVERNANCE_API_P2.md';
COMMENT ON COLUMN ldn.verification_log.record_type IS 'Entity kind: ldn | soil | drylands | intervention';