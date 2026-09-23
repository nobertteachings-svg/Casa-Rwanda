-- Replace boolean electricity with prepaid/postpaid meter type

ALTER TABLE houses
  ADD COLUMN IF NOT EXISTS electricity_meter VARCHAR(20) NOT NULL DEFAULT 'none';

UPDATE houses SET electricity_meter = CASE
  WHEN electricity = TRUE THEN 'postpaid'
  ELSE 'none'
END WHERE electricity_meter = 'none' AND electricity = TRUE;

CREATE INDEX IF NOT EXISTS idx_houses_electricity_meter ON houses(electricity_meter);
