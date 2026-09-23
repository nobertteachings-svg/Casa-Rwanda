-- PostGIS spatial index for fast proximity search (when the host supports it).
-- On hosts without PostGIS (e.g. Railway default Postgres), this no-ops safely.
-- The app uses Haversine SQL search as fallback — see house-search.ts.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'postgis'
  ) THEN
    RAISE NOTICE 'PostGIS not available on this PostgreSQL host — skipping spatial index (Haversine fallback active)';
    RETURN;
  END IF;

  CREATE EXTENSION IF NOT EXISTS postgis;

  ALTER TABLE houses
    ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

  UPDATE houses
  SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  WHERE location IS NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_houses_location_gist ON houses USING GIST (location);

  CREATE OR REPLACE FUNCTION sync_house_location()
  RETURNS TRIGGER AS $func$
  BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
      NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_house_location ON houses;
  CREATE TRIGGER trg_house_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON houses
    FOR EACH ROW
    EXECUTE FUNCTION sync_house_location();

  RAISE NOTICE 'PostGIS spatial index applied successfully';
END $$;
