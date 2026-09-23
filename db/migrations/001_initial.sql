-- Casa initial schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('landlord', 'tenant', 'admin');
CREATE TYPE user_language AS ENUM ('en', 'fr');
CREATE TYPE house_type AS ENUM ('room', 'apartment', 'villa', 'studio');
CREATE TYPE house_status AS ENUM ('active', 'inactive', 'flagged', 'under_review');
CREATE TYPE payment_method AS ENUM ('mtn_momo', 'orange_money');

CREATE TABLE users (
  phone VARCHAR(20) PRIMARY KEY,
  role user_role NOT NULL,
  language user_language NOT NULL DEFAULT 'en',
  display_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE houses (
  house_id VARCHAR(20) PRIMARY KEY,
  landlord_phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  type house_type NOT NULL,
  rent INTEGER NOT NULL CHECK (rent > 0),
  months_upfront INTEGER NOT NULL DEFAULT 1 CHECK (months_upfront >= 1),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  neighbourhood VARCHAR(120),
  city VARCHAR(80),
  fenced BOOLEAN NOT NULL DEFAULT FALSE,
  water BOOLEAN NOT NULL DEFAULT FALSE,
  borehole BOOLEAN NOT NULL DEFAULT FALSE,
  parking BOOLEAN NOT NULL DEFAULT FALSE,
  electricity BOOLEAN NOT NULL DEFAULT FALSE,
  furnished BOOLEAN NOT NULL DEFAULT FALSE,
  security BOOLEAN NOT NULL DEFAULT FALSE,
  photos TEXT[] NOT NULL DEFAULT '{}',
  ai_description TEXT,
  status house_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_houses_landlord ON houses(landlord_phone);
CREATE INDEX idx_houses_status ON houses(status);
CREATE INDEX idx_houses_location ON houses(latitude, longitude);
CREATE INDEX idx_houses_neighbourhood ON houses(neighbourhood);

CREATE TABLE unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_phone VARCHAR(20) NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  house_id VARCHAR(20) NOT NULL REFERENCES houses(house_id) ON DELETE CASCADE,
  amount_paid INTEGER NOT NULL DEFAULT 5000,
  payment_method payment_method,
  payment_reference VARCHAR(100),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_phone, house_id)
);

CREATE INDEX idx_unlocks_tenant ON unlocks(tenant_phone);
CREATE INDEX idx_unlocks_house ON unlocks(house_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_phone VARCHAR(20) NOT NULL REFERENCES users(phone),
  house_id VARCHAR(20) NOT NULL REFERENCES houses(house_id),
  amount INTEGER NOT NULL,
  method payment_method,
  reference VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_reference ON payments(reference);

CREATE TABLE listing_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id VARCHAR(20) NOT NULL REFERENCES houses(house_id) ON DELETE CASCADE,
  review_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence for CASA-XXXX house IDs
CREATE SEQUENCE house_id_seq START 1000;

CREATE OR REPLACE FUNCTION generate_house_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.house_id IS NULL OR NEW.house_id = '' THEN
    NEW.house_id := 'CASA-' || nextval('house_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_house_id
  BEFORE INSERT ON houses
  FOR EACH ROW
  EXECUTE FUNCTION generate_house_id();
