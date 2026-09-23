-- Casa feature expansion migration

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_method VARCHAR(30),
  ADD COLUMN IF NOT EXISTS is_agent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referred_by VARCHAR(20);

ALTER TABLE houses
  ADD COLUMN IF NOT EXISTS videos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trust_tier VARCHAR(20) NOT NULL DEFAULT 'standard';

ALTER TABLE unlocks
  ADD COLUMN IF NOT EXISTS beneficiary_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payer_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS agent_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS agent_commission_fcfa INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  query_json JSONB NOT NULL,
  raw_description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_tenant ON saved_searches(tenant_phone);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(active) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS shortlists (
  tenant_phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  house_id VARCHAR(20) NOT NULL REFERENCES houses(house_id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_phone, house_id)
);

CREATE TABLE IF NOT EXISTS listing_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id VARCHAR(20) NOT NULL REFERENCES houses(house_id) ON DELETE CASCADE,
  tenant_phone VARCHAR(20) NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_views_house ON listing_views(house_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_date ON listing_views(viewed_at);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_phone VARCHAR(20) NOT NULL REFERENCES users(phone),
  referred_phone VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reward_type VARCHAR(30) NOT NULL DEFAULT 'free_unlock',
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referrer_phone, referred_phone)
);

CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  credit_type VARCHAR(30) NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_user ON credits(user_phone) WHERE used = FALSE;

CREATE TABLE IF NOT EXISTS agent_landlords (
  agent_phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  landlord_phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agent_phone, landlord_phone)
);

CREATE TABLE IF NOT EXISTS ussd_sessions (
  session_id VARCHAR(40) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  step VARCHAR(40) NOT NULL DEFAULT 'menu',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
