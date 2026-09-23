-- Landlord ID verification audit trail

CREATE TABLE IF NOT EXISTS landlord_id_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  media_reference VARCHAR(120) NOT NULL,
  document_type VARCHAR(40),
  full_name VARCHAR(120),
  id_number VARCHAR(60),
  expiry_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  claude_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landlord_id_verifications_phone
  ON landlord_id_verifications(landlord_phone);

CREATE INDEX IF NOT EXISTS idx_landlord_id_verifications_status
  ON landlord_id_verifications(status);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS id_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS id_full_name VARCHAR(120);
