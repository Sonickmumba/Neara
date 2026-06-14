const { validationResult } = require('express-validator');
const pool = require('../config/database');
const {
  generateId,
  timeAgo,
  toFiniteNumberOrNull,
  roundDistance,
} = require('../utils/helpers');
const { createNotification } = require('./notificationsController');

const sqlDistanceExpression = (
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

/**
 * GET /listings
 * Scalable home feed with SQL-level distance computation
 */
exports.getAllListings = async (req, res, next) => {
  try {
    const {
      type,
      category,
      status = 'active',
      search,
      lat,
      lng,
      radius,
      minLat,
      maxLat,
      minLng,
      maxLng,
      page = 1,
      limit = 20,
    } = req.query;

    /* ---------------------------
       Pagination safety
    ---------------------------- */
    const parsedLimit = Number(limit);
    const parsedPage = Number(page);
    const safeLimit = Math.min(
      Math.max(Math.floor(Number.isFinite(parsedLimit) ? parsedLimit : 20), 1),
      50
    );
    const safePage = Math.max(
      Math.floor(Number.isFinite(parsedPage) ? parsedPage : 1),
      1
    );
    const offset = (safePage - 1) * safeLimit;

    /* ---------------------------
       Viewer reference location
       (viewer → listing relationship)
    ---------------------------- */
    const queryLat = toFiniteNumberOrNull(lat);
    const queryLng = toFiniteNumberOrNull(lng);
    const userLat = toFiniteNumberOrNull(req.user?.location_lat);
    const userLng = toFiniteNumberOrNull(req.user?.location_lng);
    const refLat = queryLat ?? userLat;
    const refLng = queryLng ?? userLng;

    const params = [];
    let idx = 1;

    /* ---------------------------
       Distance SQL fragment
    ---------------------------- */
    let distanceSelect = 'NULL::double precision AS distance';
    let distanceWhere = '';
    let boundsWhere = '';

    const parsedMinLat = Number(minLat);
    const parsedMaxLat = Number(maxLat);
    const parsedMinLng = Number(minLng);
    const parsedMaxLng = Number(maxLng);
    const hasViewportBounds = [
      parsedMinLat,
      parsedMaxLat,
      parsedMinLng,
      parsedMaxLng,
    ].every(Number.isFinite);

    if (hasViewportBounds) {
      const south = Math.max(-90, Math.min(parsedMinLat, parsedMaxLat));
      const north = Math.min(90, Math.max(parsedMinLat, parsedMaxLat));
      const west = Math.max(-180, Math.min(parsedMinLng, parsedMaxLng));
      const east = Math.min(180, Math.max(parsedMinLng, parsedMaxLng));

      boundsWhere = `
        AND l.location_lat IS NOT NULL
        AND l.location_lng IS NOT NULL
        AND l.location_lat BETWEEN $${idx++} AND $${idx++}
        AND l.location_lng BETWEEN $${idx++} AND $${idx++}
      `;

      params.push(south, north, west, east);
    }

    if (refLat != null && refLng != null) {
      distanceSelect = `
        (${sqlDistanceExpression(`$${idx}`, `$${idx + 1}`)}) AS distance
      `;
      params.push(refLat, refLng);
      idx += 2;

      const parsedRadius = toFiniteNumberOrNull(radius);
      if (parsedRadius !== null && parsedRadius > 0) {
        const safeRadius = Math.min(parsedRadius, 100);
        distanceWhere = `
          AND (${sqlDistanceExpression(`$${idx - 2}`, `$${idx - 1}`)}) <= $${idx}
        `;
        params.push(safeRadius);
        idx++;
      }
    }

    /* ---------------------------
       Base query
    ---------------------------- */
    let query = `
      SELECT
        l.*,
        u.name AS author_name,
        u.neighborhood,
        u.rating AS author_rating,
        u.total_ratings as totalRating,
        u.email_verified as isVerified,
        u.profile_image_url as profile_image_url,
        ${distanceSelect},
        COALESCE(cc.count, 0) AS responses_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FROM conversations c WHERE c.listing_id = l.id
      ) cc(count) ON true
      WHERE l.status = $${idx++}
    `;

    params.push(status);

    if (type) {
      query += ` AND l.type = $${idx++}`;
      params.push(type);
    }

    if (category) {
      query += ` AND l.category = $${idx++}`;
      params.push(category);
    }

    if (search) {
      query += `
        AND (
          l.title ILIKE $${idx}
          OR l.description ILIKE $${idx}
        )
      `;
      params.push(`%${search}%`);
      idx++;
    }

    query += `
      ${boundsWhere}
      ${distanceWhere}
      ORDER BY l.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;

    params.push(safeLimit, offset);

    const { rows } = await pool.query(query, params);

    rows.forEach((listing) => {
      listing.timeAgo = timeAgo(listing.created_at);
      if (listing.distance !== null) {
        listing.distance = roundDistance(listing.distance);
      }
    });

    res.json({
      success: true,
      page: safePage,
      limit: safeLimit,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /listings/:id
 * Distance is computed using the authenticated viewer's stored location
 * (req.user.location_lat / location_lng). Returns NULL when not available.
 */
exports.getListingsById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Use the viewer's stored location as the reference point for distance
    const refLat = toFiniteNumberOrNull(req.user?.location_lat);
    const refLng = toFiniteNumberOrNull(req.user?.location_lng);
    const hasLocation = refLat != null && refLng != null;

    const distanceExpr = hasLocation
      ? `(${sqlDistanceExpression('$2', '$3')}) AS distance`
      : 'NULL::double precision AS distance';

    const params = hasLocation ? [id, refLat, refLng] : [id];

    const { rows } = await pool.query(
      `
      SELECT
        l.*,
        u.name AS author_name,
        u.neighborhood,
        u.rating AS author_rating,
        u.total_ratings AS totalRating,
        u.email_verified AS isVerified,
        u.completed_trades AS completedTrades,
        u.profile_image_url AS profile_image_url,
        COALESCE(cc.count, 0) AS responses_count,
        ${distanceExpr}
      FROM listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FROM conversations c WHERE c.listing_id = l.id
      ) cc(count) ON true
      WHERE l.id = $1
      `,
      params
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    const listing = rows[0];
    listing.timeAgo = timeAgo(listing.created_at);

    // Round to 1 decimal place — consistent with getAllListings
    if (listing.distance != null) {
      listing.distance = roundDistance(listing.distance);
    }

    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /listings/:id/similar
 * This is a Scalable similar-listings endpoint with SQL-level ranking.
 */
exports.getSimilarListings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 4, 20);

    const baseListingResult = await pool.query(
      `
      SELECT id, user_id, category, type, location_lat, location_lng
      FROM listings
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (!baseListingResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    const listingDistanceExpr = sqlDistanceExpression(
      'b.location_lat',
      'b.location_lng'
    );

    const { rows } = await pool.query(
      `
      WITH base AS (
        SELECT id, user_id, category, type, location_lat, location_lng
        FROM listings
        WHERE id = $1
      )
      SELECT
        l.*,
        u.name AS author_name,
        u.neighborhood,
        u.rating AS author_rating,
        u.total_ratings AS totalrating,
        u.email_verified AS isverified,
        COALESCE(cc.count, 0) AS responses_count,
        CASE
          WHEN b.location_lat IS NOT NULL
            AND b.location_lng IS NOT NULL
            AND l.location_lat IS NOT NULL
            AND l.location_lng IS NOT NULL
          THEN (${listingDistanceExpr})
          ELSE NULL
        END AS distance,
        (
          CASE WHEN l.category = b.category THEN 3 ELSE 0 END +
          CASE WHEN l.type = b.type THEN 2 ELSE 0 END +
          CASE
            WHEN b.location_lat IS NOT NULL
              AND b.location_lng IS NOT NULL
              AND l.location_lat IS NOT NULL
              AND l.location_lng IS NOT NULL
            THEN GREATEST(
              0,
              1 - (
                (${listingDistanceExpr}) / 25
              )
            )
            ELSE 0
          END
        ) AS similarity_score
      FROM base b
      JOIN listings l ON l.id <> b.id
      JOIN users u ON l.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)
        FROM conversations c
        WHERE c.listing_id = l.id
      ) cc(count) ON true
      WHERE l.status = 'active'
        AND l.user_id <> b.user_id
      ORDER BY similarity_score DESC, distance ASC NULLS LAST, l.created_at DESC
      LIMIT $2
      `,
      [id, limit]
    );

    rows.forEach((listing) => {
      listing.timeAgo = timeAgo(listing.created_at);
      if (listing.distance !== null) {
        listing.distance = roundDistance(listing.distance);
      }
      delete listing.similarity_score;
    });

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /listings
 * Creates a listing and returns it with author metadata and distance computed
 * from the creator's stored location (req.user.location_lat / location_lng).
 */
exports.createListing = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      type,
      category,
      title,
      description,
      location_lat,
      location_lng,
      image_url, // Keep for backward compatibility
      image_urls,
    } = req.body;

    // Handle image URLs
    let finalImageUrls = [];
    if (image_urls) {
      try {
        finalImageUrls = JSON.parse(image_urls);
        // Validate that all URLs are proper HTTP/HTTPS URLs
        const urlRegex = /^https?:\/\/.+/;
        finalImageUrls = finalImageUrls.filter((url) => urlRegex.test(url));
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image_urls format',
        });
      }
    } else if (image_url) {
      // Backward compatibility: if image_url is provided, use it as single image
      finalImageUrls = [image_url];
    }

    // If location is not provided, use the user's (the listing owner) location
    let finalLocationLat = location_lat;
    let finalLocationLng = location_lng;

    if (finalLocationLat == null || finalLocationLng == null) {
      // Fetch user's location
      const userResult = await pool.query(
        'SELECT location_lat, location_lng FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows[0]) {
        finalLocationLat = userResult.rows[0].location_lat;
        finalLocationLng = userResult.rows[0].location_lng;
      }
    }

    const listingId = generateId();

    await pool.query(
      `
      INSERT INTO listings (
        id, user_id, type, category, title,
        description, location_lat, location_lng, image_urls
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        listingId,
        req.user.id,
        type,
        category,
        title,
        description,
        finalLocationLat,
        finalLocationLng,
        JSON.stringify(finalImageUrls),
      ]
    );

    // Fetch the listing back with author metadata and distance, matching the
    // shape returned by GET /api/listings so the frontend can display it immediately
    const refLat = toFiniteNumberOrNull(req.user?.location_lat);
    const refLng = toFiniteNumberOrNull(req.user?.location_lng);
    const hasLocation = refLat != null && refLng != null;

    const distanceExpr = hasLocation
      ? `(${sqlDistanceExpression('$2', '$3')}) AS distance`
      : 'NULL::double precision AS distance';

    const fetchParams = hasLocation ? [listingId, refLat, refLng] : [listingId];

    const { rows: listingRows } = await pool.query(
      `
      SELECT
        l.*,
        u.name AS author_name,
        u.neighborhood,
        u.rating AS author_rating,
        u.total_ratings AS totalRating,
        u.email_verified AS isVerified,
        ${distanceExpr}
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
      `,
      fetchParams
    );

    const listing = listingRows[0];
    listing.timeAgo = timeAgo(listing.created_at);

    // Round to 1 decimal place — consistent with getAllListings
    if (listing.distance != null) {
      listing.distance = roundDistance(listing.distance);
    }

    /* ---------------------------
       Real-time emit
    ---------------------------- */
    // req.app.get('io')?.emit('listing:new', listing);

    /* ---------------------------
       Async notification fan-out
    ---------------------------- */
    setImmediate(async () => {
      try {
        const { rows: users } = await pool.query(
          `
          SELECT id FROM users
          WHERE neighborhood = (
            SELECT neighborhood FROM users WHERE id = $1
          )
          AND id <> $1
          LIMIT 10
          `,
          [req.user.id]
        );

        for (const u of users) {
          await createNotification(
            u.id,
            'listing',
            'New listing in your area',
            title,
            listingId
          );
        }
      } catch (err) {
        console.error('Notification error:', err);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /listings/:id
 */
exports.deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM listings WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (!rowCount) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found or unauthorized',
      });
    }

    res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /listings/:id
 */
exports.updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fields = [];
    const params = [];
    let idx = 1;

    ['title', 'description', 'status'].forEach((field) => {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = $${idx++}`);
        params.push(req.body[field]);
      }
    });

    if (req.body.image_urls !== undefined || req.body.image_url !== undefined) {
      let imageUrls = [];

      if (req.body.image_urls !== undefined) {
        imageUrls = Array.isArray(req.body.image_urls)
          ? req.body.image_urls
          : JSON.parse(req.body.image_urls);
      } else if (req.body.image_url) {
        imageUrls = [req.body.image_url];
      }

      fields.push(`image_urls = $${idx++}`);
      params.push(JSON.stringify(imageUrls));
    }

    if (!fields.length) {
      return res
        .status(400)
        .json({ success: false, message: 'No fields to update' });
    }

    params.push(id, userId);

    const { rowCount, rows } = await pool.query(
      `
      UPDATE listings
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx++} AND user_id = $${idx}
      RETURNING *
      `,
      params
    );

    if (!rowCount) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found or unauthorized',
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
