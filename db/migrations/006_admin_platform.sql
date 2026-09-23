-- Admin platform: suspend users, unlock disputes, audit log, settings

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

ALTER TABLE unlocks
  ADD COLUMN IF NOT EXISTS disputed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_flagged BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_fingerprint VARCHAR(16) NOT NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40),
  target_id VARCHAR(120),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log (action);

CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(16)
);

INSERT INTO platform_settings (key, value)
VALUES ('unlock_fee_fcfa', '5000'::jsonb)
ON CONFLICT (key) DO NOTHING;
