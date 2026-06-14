BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION set_location_geog()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_lat IS NULL OR NEW.location_lng IS NULL THEN
    NEW.location_geog = NULL;
  ELSE
    NEW.location_geog = ST_SetSRID(
      ST_MakePoint(
        NEW.location_lng::double precision,
        NEW.location_lat::double precision
      ),
      4326
    )::geography;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS location_geog GEOGRAPHY(Point, 4326);

UPDATE users
SET location_geog = ST_SetSRID(
  ST_MakePoint(location_lng::double precision, location_lat::double precision),
  4326
)::geography
WHERE location_lat IS NOT NULL
  AND location_lng IS NOT NULL
  AND location_geog IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_location_geog
ON users USING GIST (location_geog);

DROP TRIGGER IF EXISTS trg_users_location_geog ON users;
CREATE TRIGGER trg_users_location_geog
BEFORE INSERT OR UPDATE OF location_lat, location_lng ON users
FOR EACH ROW EXECUTE FUNCTION set_location_geog();

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS location_geog GEOGRAPHY(Point, 4326);

UPDATE listings
SET location_geog = ST_SetSRID(
  ST_MakePoint(location_lng::double precision, location_lat::double precision),
  4326
)::geography
WHERE location_lat IS NOT NULL
  AND location_lng IS NOT NULL
  AND location_geog IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_location_geog
ON listings USING GIST (location_geog);

DROP TRIGGER IF EXISTS trg_listings_location_geog ON listings;
CREATE TRIGGER trg_listings_location_geog
BEFORE INSERT OR UPDATE OF location_lat, location_lng ON listings
FOR EACH ROW EXECUTE FUNCTION set_location_geog();

COMMIT;
