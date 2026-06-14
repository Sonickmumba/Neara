const locationPoint = (latSql, lngSql) => `
  ST_SetSRID(
    ST_MakePoint((${lngSql})::double precision, (${latSql})::double precision),
    4326
  )::geography
`;

let postgisLocationColumnsPromise = null;

const hasPostgisLocationColumns = async (pool) => {
  if (!postgisLocationColumnsPromise) {
    postgisLocationColumnsPromise = pool
      .query(
        `
        SELECT COUNT(*)::int AS count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name IN ('users', 'listings')
          AND column_name = 'location_geog'
        `
      )
      .then(({ rows }) => Number(rows[0]?.count || 0) === 2)
      .catch((error) => {
        console.warn(
          'PostGIS location column check failed; falling back to Haversine:',
          error.message
        );
        return false;
      });
  }

  return postgisLocationColumnsPromise;
};

const resetPostgisLocationColumnCache = () => {
  postgisLocationColumnsPromise = null;
};

const distanceKmExpression = (geographySql, refLatSql, refLngSql) => `
  ST_Distance(
    ${geographySql},
    ${locationPoint(refLatSql, refLngSql)}
  ) / 1000
`;

const distanceBetweenGeographiesKm = (
  sourceGeographySql,
  targetGeographySql
) => `
  ST_Distance(${sourceGeographySql}, ${targetGeographySql}) / 1000
`;

const withinRadiusKmExpression = (
  geographySql,
  refLatSql,
  refLngSql,
  radiusKmSql
) => `
  ST_DWithin(
    ${geographySql},
    ${locationPoint(refLatSql, refLngSql)},
    (${radiusKmSql})::double precision * 1000
  )
`;

const haversineDistanceKmExpression = (
  refLatSql,
  refLngSql,
  targetLatSql = 'l.location_lat',
  targetLngSql = 'l.location_lng'
) => `
  6371 * acos(
    LEAST(1, GREATEST(-1,
      cos(radians(${refLatSql})) *
      cos(radians(${targetLatSql})) *
      cos(radians(${targetLngSql}) - radians(${refLngSql})) +
      sin(radians(${refLatSql})) *
      sin(radians(${targetLatSql}))
    ))
  )
`;

const haversineWithinRadiusKmExpression = (
  refLatSql,
  refLngSql,
  radiusKmSql,
  targetLatSql = 'l.location_lat',
  targetLngSql = 'l.location_lng'
) => `
  (${haversineDistanceKmExpression(
    refLatSql,
    refLngSql,
    targetLatSql,
    targetLngSql
  )}) <= (${radiusKmSql})::double precision
`;

const listingDistanceKmExpression = (usePostgis, refLatSql, refLngSql) =>
  usePostgis
    ? distanceKmExpression('l.location_geog', refLatSql, refLngSql)
    : haversineDistanceKmExpression(refLatSql, refLngSql);

const listingWithinRadiusKmExpression = (
  usePostgis,
  refLatSql,
  refLngSql,
  radiusKmSql
) =>
  usePostgis
    ? withinRadiusKmExpression(
        'l.location_geog',
        refLatSql,
        refLngSql,
        radiusKmSql
      )
    : haversineWithinRadiusKmExpression(refLatSql, refLngSql, radiusKmSql);

const listingLocationNotNullSql = (usePostgis) =>
  usePostgis
    ? 'l.location_geog IS NOT NULL'
    : 'l.location_lat IS NOT NULL AND l.location_lng IS NOT NULL';

module.exports = {
  locationPoint,
  hasPostgisLocationColumns,
  resetPostgisLocationColumnCache,
  distanceKmExpression,
  distanceBetweenGeographiesKm,
  withinRadiusKmExpression,
  haversineDistanceKmExpression,
  haversineWithinRadiusKmExpression,
  listingDistanceKmExpression,
  listingWithinRadiusKmExpression,
  listingLocationNotNullSql,
};
