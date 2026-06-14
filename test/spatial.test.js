const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

const {
  distanceKmExpression,
  hasPostgisLocationColumns,
  haversineDistanceKmExpression,
  listingDistanceKmExpression,
  withinRadiusKmExpression,
  resetPostgisLocationColumnCache,
} = require('../utils/spatial');

test('distanceKmExpression uses PostGIS distance in kilometers', () => {
  const sql = distanceKmExpression('l.location_geog', '$1', '$2');

  assert.match(sql, /ST_Distance/);
  assert.match(sql, /l\.location_geog/);
  assert.match(sql, /ST_MakePoint\(\(\$2\)::double precision, \(\$1\)::double precision\)/);
  assert.match(sql, /::geography/);
  assert.match(sql, /\/ 1000/);
});

test('withinRadiusKmExpression uses index-friendly ST_DWithin in meters', () => {
  const sql = withinRadiusKmExpression('l.location_geog', '$1', '$2', '$3');

  assert.match(sql, /ST_DWithin/);
  assert.match(sql, /l\.location_geog/);
  assert.match(sql, /\(\$3\)::double precision \* 1000/);
});

test('listingDistanceKmExpression falls back to Haversine before migration', () => {
  const sql = listingDistanceKmExpression(false, '$1', '$2');

  assert.match(sql, /6371 \* acos/);
  assert.match(sql, /l\.location_lat/);
  assert.match(sql, /l\.location_lng/);
});

test('listingDistanceKmExpression uses PostGIS after migration', () => {
  const sql = listingDistanceKmExpression(true, '$1', '$2');

  assert.match(sql, /ST_Distance/);
  assert.match(sql, /l\.location_geog/);
});

test('haversineDistanceKmExpression supports custom coordinate columns', () => {
  const sql = haversineDistanceKmExpression(
    '$1',
    '$2',
    'location_lat',
    'location_lng'
  );

  assert.match(sql, /cos\(radians\(location_lat\)\)/);
  assert.match(sql, /radians\(location_lng\) - radians\(\$2\)/);
});

test('hasPostgisLocationColumns returns true only when both tables are migrated', async () => {
  resetPostgisLocationColumnCache();
  const migratedPool = {
    query: async () => ({ rows: [{ count: 2 }] }),
  };

  assert.equal(await hasPostgisLocationColumns(migratedPool), true);

  resetPostgisLocationColumnCache();
  const unmigratedPool = {
    query: async () => ({ rows: [{ count: 0 }] }),
  };

  assert.equal(await hasPostgisLocationColumns(unmigratedPool), false);
});

test('schema installs and maintains PostGIS geography columns', () => {
  const schema = readFileSync('db/schema.sql', 'utf8');

  assert.match(schema, /CREATE EXTENSION IF NOT EXISTS postgis/);
  assert.match(schema, /ALTER TABLE users\s+ADD COLUMN IF NOT EXISTS location_geog GEOGRAPHY\(Point, 4326\)/);
  assert.match(schema, /ALTER TABLE listings\s+ADD COLUMN IF NOT EXISTS location_geog GEOGRAPHY\(Point, 4326\)/);
  assert.match(schema, /idx_users_location_geog\s+ON users USING GIST \(location_geog\)/);
  assert.match(schema, /idx_listings_location_geog\s+ON listings USING GIST \(location_geog\)/);
  assert.match(schema, /CREATE OR REPLACE FUNCTION set_location_geog\(\)/);
  assert.match(schema, /BEFORE INSERT OR UPDATE OF location_lat, location_lng ON users/);
  assert.match(schema, /BEFORE INSERT OR UPDATE OF location_lat, location_lng ON listings/);
});

test('production migration contains the same PostGIS upgrade pieces', () => {
  const migration = readFileSync('db/migration_postgis.sql', 'utf8');

  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS postgis/);
  assert.match(migration, /ALTER TABLE users\s+ADD COLUMN IF NOT EXISTS location_geog GEOGRAPHY\(Point, 4326\)/);
  assert.match(migration, /ALTER TABLE listings\s+ADD COLUMN IF NOT EXISTS location_geog GEOGRAPHY\(Point, 4326\)/);
  assert.match(migration, /UPDATE users\s+SET location_geog = ST_SetSRID/);
  assert.match(migration, /UPDATE listings\s+SET location_geog = ST_SetSRID/);
  assert.match(migration, /idx_users_location_geog\s+ON users USING GIST \(location_geog\)/);
  assert.match(migration, /idx_listings_location_geog\s+ON listings USING GIST \(location_geog\)/);
});
