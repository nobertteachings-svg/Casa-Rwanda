-- Property taxonomy: residential/commercial, regions, subtypes, standby generator

ALTER TABLE houses
  ADD COLUMN IF NOT EXISTS property_category VARCHAR(20) NOT NULL DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS property_subtype VARCHAR(50),
  ADD COLUMN IF NOT EXISTS region VARCHAR(80),
  ADD COLUMN IF NOT EXISTS town VARCHAR(80),
  ADD COLUMN IF NOT EXISTS standby_generator BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill subtype from legacy type where missing
UPDATE houses SET property_subtype = CASE
  WHEN type::text = 'studio' THEN 'studio'
  WHEN type::text = 'apartment' THEN 'apartment_2room_1toilet'
  WHEN type::text = 'villa' THEN 'apartment_3room_plus'
  ELSE 'single_room_basic'
END WHERE property_subtype IS NULL;

ALTER TABLE houses ALTER COLUMN property_subtype SET DEFAULT 'single_room_basic';

CREATE INDEX IF NOT EXISTS idx_houses_category ON houses(property_category);
CREATE INDEX IF NOT EXISTS idx_houses_region ON houses(region);
