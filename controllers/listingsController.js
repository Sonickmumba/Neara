// const { validationResult } = require('express-validator');
// const pool = require('../config/db');
// const { generateId, calculateDistance, timeAgo } = require('../utils/helpers');
// const { createNotification } = require('./notificationsController');

// // Get all listings (with filters)
// exports.getAllListings = async (req, res, next) => {
//   try {
//     const { type, category, status, search, lat, lng, radius } = req.query;

//     let query = `
//       SELECT
//         l.*,
//         u.name AS author_name,
//         u.neighborhood,
//         u.rating AS author_rating,
//         u.location_lat,
//         u.location_lng,
//         COALESCE(conversation_counts.conversation_count, 0) as responses_count
//       FROM listings l
//       JOIN users u ON l.user_id = u.id
//       LEFT JOIN (
//         SELECT listing_id, COUNT(*) as conversation_count
//         FROM conversations
//         GROUP BY listing_id
//       ) conversation_counts ON l.id = conversation_counts.listing_id
//       WHERE 1 = 1
//     `;

//     const params = [];
//     let idx = 1;

//     if (type) {
//       query += ` AND l.type = $${idx++}`;
//       params.push(type);
//     }

//     if (category) {
//       query += ` AND l.category = $${idx++}`;
//       params.push(category);
//     }

//     if (status) {
//       query += ` AND l.status = $${idx++}`;
//       params.push(status);
//     } else {
//       query += ` AND l.status = $${idx++}`;
//       params.push('active');
//     }

//     if (search) {
//       query += `
//         AND (
//           l.title ILIKE $${idx}
//           OR l.description ILIKE $${idx}
//         )
//       `;
//       params.push(`%${search}%`);
//       idx++;
//     }

//     query += ` ORDER BY l.created_at DESC`;

//     let { rows: listings } = await pool.query(query, params);

//     // Determine reference location (viewer context)
//     let refLat = null;
//     let refLng = null;

//     // Search-provided reference (highest priority)
//     if (lat && lng) {
//       refLat = parseFloat(lat);
//       refLng = parseFloat(lng);
//     }
//     // Fallback: authenticated user location
//     else if (req.user?.location_lat && req.user?.location_lng) {
//       refLat = parseFloat(req.user.location_lat);
//       refLng = parseFloat(req.user.location_lng);
//     }

//     if (refLat !== null && refLng !== null) {
//       listings.forEach((listing) => {
//         if (listing.location_lat && listing.location_lng) {
//           const distance = calculateDistance(
//             refLat,
//             refLng,
//             parseFloat(listing.location_lat),
//             parseFloat(listing.location_lng)
//           );
//           listing.distance = Number(distance.toFixed(1));
//         } else {
//           listing.distance = null;
//         }
//       });

//       if (radius) {
//         const r = parseFloat(radius);
//         listings = listings.filter(
//           (l) => typeof l.distance === 'number' && l.distance <= r
//         );
//       }
//     }

//     // Time ago
//     listings.forEach((listing) => {
//       listing.timeAgo = timeAgo(listing.created_at);
//     });

//     res.json({
//       success: true,
//       count: listings.length,
//       data: listings,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Get listing by ID
// exports.getListingsById = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     const listingsResult = await pool.query(
//       `
//             SELECT l.*, u.name AS authors_name, u.neighborhood, u.rating as author_rating,
//               u.completed_trades, u.location_lat, u.location_lng,
//               COALESCE(conversation_counts.conversation_count, 0) as responses_count
//               FROM listings l
//               JOIN users u ON l.user_id = u.id
//               LEFT JOIN (
//                 SELECT listing_id, COUNT(*) as conversation_count
//                 FROM conversations
//                 GROUP BY listing_id
//               ) conversation_counts ON l.id = conversation_counts.listing_id
//               WHERE l.id = $1
//             `,
//       [id]
//     );

//     const listings = listingsResult.rows;

//     if (listings.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Listing not found!',
//       });
//     }

//     const listing = listings[0];
//     listing.timeAgo = timeAgo(listing.created_at);

//     res.json({
//       success: true,
//       data: listing,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Create listing
// exports.createListing = async (req, res, next) => {
//   try {
//     const errors = validationResult(req);

//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         errors: errors.array(),
//       });
//     }

//     const {
//       type,
//       category,
//       title,
//       description,
//       location_lat,
//       location_lng,
//       image_url,
//     } = req.body;

//     const userId = req.user.id;

//     const listingId = generateId();

//     await pool.query(
//       `INSERT INTO listings (id, user_id, type, category, title, description, location_lat, location_lng, image_urls) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
//       [
//         listingId,
//         userId,
//         type,
//         category,
//         title,
//         description,
//         location_lat,
//         location_lng,
//         JSON.stringify(finalImageUrls),
//       ]
//     );

//     const newListingResult = await pool.query(
//       `SELECT
//         l.*,
//         u.name AS author_name,
//         u.neighborhood,
//         u.rating AS author_rating,
//         u.location_lat,
//         u.location_lng,
//         COALESCE(conversation_counts.conversation_count, 0) as responses_count
//       FROM listings l
//       JOIN users u ON l.user_id = u.id
//       LEFT JOIN (
//         SELECT listing_id, COUNT(*) as conversation_count
//         FROM conversations
//         GROUP BY listing_id
//       ) conversation_counts ON l.id = conversation_counts.listing_id
//       WHERE l.id = $1`,
//       [listingId]
//     );

//     const listing = newListingResult.rows[0];
//     console.log('first-listing', listing);

//     // Add timeAgo
//     listing.timeAgo = timeAgo(listing.created_at);

//     // Set default distance for newly created listings (assume nearby)
//     listing.distance = 0;

//     // 🔴 EMIT REAL-TIME EVENT
//     const io = req.app.get('io');

//     io.emit('listing:new', listing);

//     // Create notifications for users in the same neighborhood
//     try {
//       const nearbyUsersResult = await pool.query(
//         `SELECT id, name FROM users
//          WHERE neighborhood = $1 AND id != $2
//          LIMIT 10`, // Limit to prevent too many notifications
//         [listing.neighborhood, userId]
//       );

//       const nearbyUsers = nearbyUsersResult.rows;
//       for (const nearbyUser of nearbyUsers) {
//         await createNotification(
//           nearbyUser.id,
//           'listing',
//           'New listing in your area',
//           `${listing.title} - ${listing.description.substring(0, 50)}...`,
//           listingId
//         );
//       }
//     } catch (notificationError) {
//       console.error('Error creating notifications:', notificationError);
//       // Don't fail the listing creation if notifications fail
//     }

//     console.log('last listing:', listing);

//     res.status(201).json({
//       success: true,
//       message: 'Listing created successfully',
//       data: listing,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Update listing

// exports.updateListing = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { title, description, status, image_url } = req.body;
//     const userId = req.user.id;

//     // verify if listing already exist and belongs to the user

//     const listingToUpdateResult = await pool.query(
//       `SELECT * FROM listings WHERE id = $1 AND user_id = $2`,
//       [id, userId]
//     );

//     listingResult = listingToUpdateResult.rows;

//     if (listingResult.length === 0) {
//       return res.json({
//         success: false,
//         message: 'Listing not found or you are not authorised',
//       });
//     }

//     const updates = [];
//     const params = [];
//     let idx = 1;

//     if (title) {
//       updates.push(`title = $${idx++}`);
//       params.push(title);
//     }

//     if (description) {
//       updates.push(`description = $${idx++}`);
//       params.push(description);
//     }

//     if (status) {
//       updates.push(`status = $${idx++}`);
//       params.push(status);
//     }

//     if (image_url) {
//       updates.push(`image_url = $${idx++}`);
//       params.push(image_url);
//     }

//     if (updates.length > 0) {
//       params.push(id);

//       await pool.query(
//         `UPDATE listings
//                 SET ${updates.join(', ')}
//                 WHERE id = $${idx}`,
//         params
//       );
//     }

//     const { rows } = await pool.query(`SELECT * FROM listings WHERE id = $1`, [
//       id,
//     ]);

//     const updatedListing = rows[0];

//     res.json({
//       success: true,
//       message: 'Listing updated successfully',
//       data: updatedListing,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Delete listing

// exports.deleteListing = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     // verify if the lisiting to delete exists
//     const listingToDeleteResult = await pool.query(
//       `SELECT * FROM listings WHERE id = $1 AND user_id = $2`,
//       [id, userId]
//     );

//     const listingToDelete = listingToDeleteResult.rows;

//     if (listingToDelete.length === 0) {
//       return res.status().json({
//         success: false,
//         message: 'Listing does not exist or  unauthorised',
//       });
//     }

//     await pool.query(`DELETE FROM listings WHERE id = $1 AND user_id = $2`, [
//       id,
//       userId,
//     ]);

//     res.json({
//       success: true,
//       message: 'Listing deleted successfully',
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Get user's listings
// exports.getUserListings = async (req, res, next) => {
//   try {
//     let userId = req.params.userId;

//     // Resolve "me"
//     if (userId === 'me') {
//       userId = req.user.id;
//     }

//     const userListingsResult = await pool.query(
//       `SELECT l.*, u.name as author_name FROM listings l JOIN users u ON l.user_id = u.id WHERE l.user_id = $1 ORDER BY l.created_at DESC`,
//       [userId]
//     );

//     const userListings = userListingsResult.rows;

//     userListings.forEach((listing) => {
//       listing.timeAgo = timeAgo(listing.created_at);
//     });

//     res.json({
//       success: true,
//       count: userListings.length,
//       data: userListings,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.getSimilarListings = async (req, res, next) => {
//   try {
//     const { listingId } = req.params;

//     // Get reference listing WITH neighborhood
//     const referenceResult = await pool.query(
//       `
//       SELECT
//         l.category,
//         l.type,
//         l.user_id,
//         u.neighborhood
//       FROM listings l
//       JOIN users u ON l.user_id = u.id
//       WHERE l.id = $1
//       `,
//       [listingId]
//     );

//     if (referenceResult.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Listing not found',
//       });
//     }

//     const { category, type, neighborhood, user_id } = referenceResult.rows[0];

//     // 2. Fetch similar listings
//     const similarResult = await pool.query(
//       `
//       SELECT
//         l.id,
//         l.title,
//         l.category,
//         u.neighborhood
//       FROM listings l
//       JOIN users u ON l.user_id = u.id
//       WHERE l.category = $1
//         AND l.type = $2
//         AND l.id <> $3
//         AND l.user_id <> $4
//         AND l.status = 'active'
//       ORDER BY
//         (u.neighborhood = $5) DESC,
//         l.created_at DESC
//       LIMIT 5
//       `,
//       [category, type, listingId, user_id, neighborhood]
//     );

//     res.json({
//       success: true,
//       data: similarResult.rows,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// second copy

// const { validationResult } = require('express-validator');
// const pool = require('../config/database');
// const { generateId, timeAgo } = require('../utils/helpers');
// const { createNotification } = require('./notificationsController');

// /**
//  * GET /listings
//  * Scalable, paginated, SQL-level filtering
//  */
// exports.getAllListings = async (req, res, next) => {
//   try {
//     const {
//       type,
//       category,
//       status = 'active',
//       search,
//       lat,
//       lng,
//       radius,
//       page = 1,
//       limit = 20,
//     } = req.query;

//     const safeLimit = Math.min(parseInt(limit, 10) || 20, 50);
//     const offset = (parseInt(page, 10) - 1) * safeLimit;

//     const params = [];
//     let idx = 1;

//     const refLat = lat ? parseFloat(lat) : req.user?.location_lat;
//     const refLng = lng ? parseFloat(lng) : req.user?.location_lng;

//     let distanceSelect = 'NULL AS distance';
//     let distanceWhere = '';

//     if (refLat && refLng) {
//       distanceSelect = `
//         (
//           6371 * acos(
//             cos(radians($${idx})) *
//             cos(radians(l.location_lat)) *
//             cos(radians(l.location_lng) - radians($${idx + 1})) +
//             sin(radians($${idx})) *
//             sin(radians(l.location_lat))
//           )
//         ) AS distance
//       `;
//       params.push(refLat, refLng);
//       idx += 2;

//       if (radius) {
//         distanceWhere = `AND (
//           6371 * acos(
//             cos(radians($${idx - 2})) *
//             cos(radians(l.location_lat)) *
//             cos(radians(l.location_lng) - radians($${idx - 1})) +
//             sin(radians($${idx - 2})) *
//             sin(radians(l.location_lat))
//           )
//         ) <= $${idx}`;
//         params.push(parseFloat(radius));
//         idx++;
//       }
//     }

//     let query = `
//       SELECT
//         l.*,
//         u.name AS author_name,
//         u.neighborhood,
//         u.rating AS author_rating,
//         ${distanceSelect},
//         COALESCE(cc.count, 0) AS responses_count
//       FROM listings l
//       JOIN users u ON l.user_id = u.id
//       LEFT JOIN LATERAL (
//         SELECT COUNT(*) FROM conversations c WHERE c.listing_id = l.id
//       ) cc(count) ON true
//       WHERE l.status = $${idx++}
//     `;

//     params.push(status);

//     if (type) {
//       query += ` AND l.type = $${idx++}`;
//       params.push(type);
//     }

//     if (category) {
//       query += ` AND l.category = $${idx++}`;
//       params.push(category);
//     }

//     if (search) {
//       query += `
//         AND (l.title ILIKE $${idx} OR l.description ILIKE $${idx})
//       `;
//       params.push(`%${search}%`);
//       idx++;
//     }

//     query += `
//       ${distanceWhere}
//       ORDER BY l.created_at DESC
//       LIMIT $${idx++} OFFSET $${idx}
//     `;

//     params.push(safeLimit, offset);

//     const { rows } = await pool.query(query, params);

//     rows.forEach((l) => {
//       l.timeAgo = timeAgo(l.created_at);
//       if (l.distance !== null) {
//         l.distance = Number(l.distance.toFixed(1));
//       }
//     });

//     res.json({
//       success: true,
//       page: Number(page),
//       limit: safeLimit,
//       count: rows.length,
//       data: rows,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * GET /listings/:id
//  */
// exports.getListingsById = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     const { rows } = await pool.query(
//       `
//       SELECT
//         l.*,
//         u.name AS author_name,
//         u.neighborhood,
//         u.rating AS author_rating,
//         COALESCE(cc.count, 0) AS responses_count
//       FROM listings l
//       JOIN users u ON l.user_id = u.id
//       LEFT JOIN LATERAL (
//         SELECT COUNT(*) FROM conversations c WHERE c.listing_id = l.id
//       ) cc(count) ON true
//       WHERE l.id = $1
//       `,
//       [id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ success: false, message: 'Listing not found' });
//     }

//     const listing = rows[0];
//     listing.timeAgo = timeAgo(listing.created_at);

//     res.json({ success: true, data: listing });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * POST /listings
//  */
// exports.createListing = async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     const {
//       type,
//       category,
//       title,
//       description,
//       location_lat,
//       location_lng,
//       image_url,
//     } = req.body;

//     const listingId = generateId();

//     const { rows } = await pool.query(
//       `
//       INSERT INTO listings (
//         id, user_id, type, category, title, description,
//         location_lat, location_lng, image_url
//       )
//       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
//       RETURNING *
//       `,
//       [
//         listingId,
//         req.user.id,
//         type,
//         category,
//         title,
//         description,
//         location_lat,
//         location_lng,
//         image_url,
//       ]
//     );

//     const listing = rows[0];
//     listing.timeAgo = timeAgo(listing.created_at);
//     listing.distance = 0;

//     req.app.get('io')?.emit('listing:new', listing);

//     // Async notification fan-out
//     setImmediate(async () => {
//       try {
//         const { rows: users } = await pool.query(
//           `
//           SELECT id FROM users
//           WHERE neighborhood = (
//             SELECT neighborhood FROM users WHERE id = $1
//           )
//           AND id <> $1
//           LIMIT 10
//           `,
//           [req.user.id]
//         );

//         for (const u of users) {
//           await createNotification(
//             u.id,
//             'listing',
//             'New listing in your area',
//             title,
//             listingId
//           );
//         }
//       } catch (e) {
//         console.error('Notification error:', e);
//       }
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Listing created successfully',
//       data: listing,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * PATCH /listings/:id
//  */
// exports.updateListing = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const fields = [];
//     const params = [];
//     let idx = 1;

//     ['title', 'description', 'status', 'image_url'].forEach((field) => {
//       if (req.body[field] !== undefined) {
//         fields.push(`${field} = $${idx++}`);
//         params.push(req.body[field]);
//       }
//     });

//     if (!fields.length) {
//       return res.status(400).json({ success: false, message: 'No fields to update' });
//     }

//     params.push(id, userId);

//     const { rowCount, rows } = await pool.query(
//       `
//       UPDATE listings
//       SET ${fields.join(', ')}, updated_at = NOW()
//       WHERE id = $${idx++} AND user_id = $${idx}
//       RETURNING *
//       `,
//       params
//     );

//     if (!rowCount) {
//       return res.status(404).json({
//         success: false,
//         message: 'Listing not found or unauthorized',
//       });
//     }

//     res.json({ success: true, data: rows[0] });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * DELETE /listings/:id
//  */
// exports.deleteListing = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     const { rowCount } = await pool.query(
//       `DELETE FROM listings WHERE id = $1 AND user_id = $2`,
//       [id, req.user.id]
//     );

//     if (!rowCount) {
//       return res.status(404).json({
//         success: false,
//         message: 'Listing not found or unauthorized',
//       });
//     }

//     res.json({ success: true, message: 'Listing deleted successfully' });
//   } catch (error) {
//     next(error);
//   }
// };

const { validationResult } = require('express-validator');
const pool = require('../config/database');
const { generateId, timeAgo } = require('../utils/helpers');
const { createNotification } = require('./notificationsController');

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
    const safeLimit = Math.min(Number(limit) || 20, 50);
    const offset = (Number(page) - 1) * safeLimit;

    /* ---------------------------
       Viewer reference location
       (viewer → listing relationship)
    ---------------------------- */
    const refLat = lat ? Number(lat) : req.user?.location_lat;
    const refLng = lng ? Number(lng) : req.user?.location_lng;

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
        (
          6371 * acos(
            cos(radians($${idx})) *
            cos(radians(l.location_lat)) *
            cos(radians(l.location_lng) - radians($${idx + 1})) +
            sin(radians($${idx})) *
            sin(radians(l.location_lat))
          )
        ) AS distance
      `;
      params.push(refLat, refLng);
      idx += 2;

      if (radius) {
        const safeRadius = Math.min(Number(radius), 100);
        distanceWhere = `
          AND (
            6371 * acos(
              cos(radians($${idx - 2})) *
              cos(radians(l.location_lat)) *
              cos(radians(l.location_lng) - radians($${idx - 1})) +
              sin(radians($${idx - 2})) *
              sin(radians(l.location_lat))
            )
          ) <= $${idx}
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
        listing.distance = Number(listing.distance.toFixed(1));
      }
    });

    res.json({
      success: true,
      page: Number(page),
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
 * No distance unless viewer location is supplied
 */
exports.getListingsById = async (req, res, next) => {
  try {
    const { id } = req.params;

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
        COALESCE(cc.count, 0) AS responses_count
      FROM listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FROM conversations c WHERE c.listing_id = l.id
      ) cc(count) ON true
      WHERE l.id = $1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    const listing = rows[0];
    listing.timeAgo = timeAgo(listing.created_at);

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
          THEN (
            6371 * acos(
              cos(radians(b.location_lat)) *
              cos(radians(l.location_lat)) *
              cos(radians(l.location_lng) - radians(b.location_lng)) +
              sin(radians(b.location_lat)) *
              sin(radians(l.location_lat))
            )
          )
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
                (
                  6371 * acos(
                    cos(radians(b.location_lat)) *
                    cos(radians(l.location_lat)) *
                    cos(radians(l.location_lng) - radians(b.location_lng)) +
                    sin(radians(b.location_lat)) *
                    sin(radians(l.location_lat))
                  )
                ) / 25
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
        listing.distance = Number(listing.distance.toFixed(1));
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
 * Distance is NOT computed here
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

    // Fetch the listing back with author metadata, matching the shape returned by GET /api/listings
    const { rows: listingRows } = await pool.query(
      `
      SELECT
        l.*,
        u.name AS author_name,
        u.neighborhood,
        u.rating AS author_rating,
        u.total_ratings AS totalRating,
        u.email_verified AS isVerified
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
      `,
      [listingId]
    );

    const listing = listingRows[0];
    listing.timeAgo = timeAgo(listing.created_at);

    /* ---------------------------
       Real-time emit WITHOUT distance
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

    ['title', 'description', 'status', 'image_url'].forEach((field) => {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = $${idx++}`);
        params.push(req.body[field]);
      }
    });

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
