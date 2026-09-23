-- Indexes for rent-filtered search and daily unlock counts

CREATE INDEX IF NOT EXISTS idx_houses_rent ON houses(rent);

CREATE INDEX IF NOT EXISTS idx_unlocks_tenant_paid_at ON unlocks(tenant_phone, paid_at DESC);
