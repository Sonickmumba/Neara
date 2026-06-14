const pool = require('../config/database');
const { generateId, timeAgo } = require('../utils/helpers');
const { uploadToCloudinary } = require('../utils/imageService');
const { sendPushToUser } = require('../utils/pushService');

async function markConversationReadForUser(db, conversationId, userId) {
  const messagesResult = await db.query(
    `
    UPDATE messages
    SET is_read = true
    WHERE conversation_id = $1
      AND sender_id <> $2
      AND is_read = false
    `,
    [conversationId, userId]
  );

  const notificationsResult = await db.query(
    `
    UPDATE notifications
    SET is_read = true
    WHERE user_id = $2
      AND type = 'message'
      AND reference_id = $1
      AND is_read = false
    `,
    [conversationId, userId]
  );

  return {
    messagesRead: messagesResult.rowCount,
    notificationsRead: notificationsResult.rowCount,
  };
}

// Get user's conversations
exports.getUserConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const before = req.query.before;
    const beforeId = req.query.beforeId;
    const search = (req.query.search || '').trim();
    const allowedFilters = new Set(['all', 'unread', 'active-trades']);
    const filter = allowedFilters.has(req.query.filter)
      ? req.query.filter
      : 'all';

    const params = [userId];
    let whereClause = `
      WHERE (c.participant1_id = $1 OR c.participant2_id = $1)
    `;

    if (search) {
      params.push(`%${search}%`);
      const searchParam = `$${params.length}`;

      whereClause += `
        AND (
          l.title ILIKE ${searchParam}
          OR CASE
            WHEN c.participant1_id = $1 THEN u2.name
            ELSE u1.name
          END ILIKE ${searchParam}
          OR EXISTS (
            SELECT 1
            FROM messages sm
            WHERE sm.conversation_id = c.id
              AND sm.content ILIKE ${searchParam}
          )
        )
      `;
    }

    if (filter === 'unread') {
      whereClause += `
        AND EXISTS (
          SELECT 1
          FROM messages um
          WHERE um.conversation_id = c.id
            AND um.sender_id <> $1
            AND um.is_read = FALSE
        )
      `;
    }

    if (filter === 'active-trades') {
      whereClause += `
        AND EXISTS (
          SELECT 1
          FROM trades t
          WHERE t.listing_id = c.listing_id
            AND t.status IN ('pending', 'accepted')
            AND (t.requester_id = $1 OR t.owner_id = $1)
        )
      `;
    }

    if (before && beforeId) {
      params.push(before, beforeId);
      const beforeParam = `$${params.length - 1}`;
      const beforeIdParam = `$${params.length}`;

      whereClause += `
        AND (
          COALESCE(c.last_message_at, c.created_at), c.id
        ) < (${beforeParam}::timestamp, ${beforeIdParam})
      `;
    }

    params.push(limit + 1);
    const limitParam = `$${params.length}`;

    const result = await pool.query(
      `
      SELECT 
        c.*,
        l.title AS listing_title,

        CASE 
          WHEN c.participant1_id = $1 THEN u2.name
          ELSE u1.name
        END AS partner_name,

        CASE
          WHEN c.participant1_id = $1 THEN u2.rating
          ELSE u1.rating
        END AS partner_rating,

        CASE
          WHEN c.participant1_id = $1 THEN u2.email_verified
          ELSE u1.email_verified
        END AS partner_is_verified,

        CASE
          WHEN c.participant1_id = $1 THEN u2.total_ratings
          ELSE u1.total_ratings
        END AS partner_total_ratings,

        CASE
          WHEN c.participant1_id = $1 THEN c.participant2_id
          ELSE c.participant1_id
        END AS partner_id,

        CASE
          WHEN c.participant1_id = $1 THEN u2.profile_image_url
          ELSE u1.profile_image_url
        END AS partner_profile_image_url,

        (
          SELECT m.content
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message,

        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id <> $1
            AND m.is_read = FALSE
        ) AS unread_count

        ,EXISTS (
          SELECT 1
          FROM trades t
          WHERE t.listing_id = c.listing_id
            AND t.status IN ('pending', 'accepted')
            AND (t.requester_id = $1 OR t.owner_id = $1)
        ) AS has_active_trade

      FROM conversations c
      JOIN listings l ON c.listing_id = l.id
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      ${whereClause}
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC
      LIMIT ${limitParam}
      `,
      params
    );

    const countsResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS all_count,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM messages um
            WHERE um.conversation_id = c.id
              AND um.sender_id <> $1
              AND um.is_read = FALSE
          )
        )::int AS unread_count,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM trades t
            WHERE t.listing_id = c.listing_id
              AND t.status IN ('pending', 'accepted')
              AND (t.requester_id = $1 OR t.owner_id = $1)
          )
        )::int AS active_trades_count
      FROM conversations c
      WHERE c.participant1_id = $1
         OR c.participant2_id = $1
      `,
      [userId]
    );

    const counts = countsResult.rows[0] || {
      all_count: 0,
      unread_count: 0,
      active_trades_count: 0,
    };

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    const conversations = rows;

    // add timeAgo key to each conversation
    conversations.forEach((conv) => {
      conv.timeAgo = timeAgo(conv.last_message_at || conv.created_at);
      conv.unread_count = Number(conv.unread_count || 0);
    });

    const nextCursor = conversations.length
      ? {
          before:
            conversations[conversations.length - 1].last_message_at ||
            conversations[conversations.length - 1].created_at,
          beforeId: conversations[conversations.length - 1].id,
        }
      : null;

    res.json({
      success: true,
      count: conversations.length,
      hasMore,
      nextCursor,
      counts: {
        all: Number(counts.all_count || 0),
        unread: Number(counts.unread_count || 0),
        activeTrades: Number(counts.active_trades_count || 0),
      },
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

// get or create conversation
exports.getOrCreateConversation = async (req, res, next) => {
  try {
    const listingId = req.body.listingId || req.body.listing_id;
    const participantId = req.body.participantId || req.body.participant_id;
    const userId = req.user.id;

    if (!listingId || !participantId) {
      return res.status(400).json({
        success: false,
        message: 'listingId and participantId are required',
      });
    }

    if (userId === participantId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot conversate with yourself!',
      });
    }
    // check if conversation already exist
    const conversationResult = await pool.query(
      `SELECT * FROM conversations WHERE listing_id = $1 AND ((participant1_id = $2 AND participant2_id = $3) OR (participant1_id = $4 AND participant2_id = $5))`,
      [listingId, userId, participantId, participantId, userId]
    );
    const conversation = conversationResult.rows;

    if (conversation.length > 0) {
      return res.json({ success: true, data: conversation[0] });
    }

    // create new conversion
    const conversationId = generateId();
    await pool.query(
      `INSERT INTO conversations (id, listing_id, participant1_id, participant2_id) VALUES ($1, $2, $3, $4)`,
      [conversationId, listingId, userId, participantId]
    );

    // Increment responses_count for the listing
    await pool.query(
      `UPDATE listings SET responses_count = responses_count + 1 WHERE id = $1`,
      [listingId]
    );

    const newConversation = await pool.query(
      `SELECT * FROM conversations WHERE id = $1`,
      [conversationId]
    );

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: newConversation.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Get messages in conversation
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const before = req.query.before;
    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);

    // check if user is part of the conversation
    const conversationResult = await pool.query(
      `SELECT * FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $3)`,
      [conversationId, userId, userId]
    );
    const conversation = conversationResult.rows;

    if (conversation.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access to messages denied ',
      });
    }

    let messagesResult;

    if (before) {
      messagesResult = await pool.query(
        `
        SELECT m.*, u.name as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
          AND m.created_at < $2::timestamp
        ORDER BY m.created_at DESC
        LIMIT $3
        `,
        [conversationId, before, limit + 1]
      );
    } else {
      messagesResult = await pool.query(
        `
        SELECT m.*, u.name as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2
        `,
        [conversationId, limit + 1]
      );
    }

    const hasMore = messagesResult.rows.length > limit;
    const slice = hasMore
      ? messagesResult.rows.slice(0, limit)
      : messagesResult.rows;
    const messages = [...slice].reverse();

    // Mark messages as read
    if (!before) {
      await markConversationReadForUser(pool, conversationId, userId);
    }

    res.json({
      success: true,
      count: messages.length,
      hasMore,
      nextCursor: messages.length ? messages[0].created_at : null,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

exports.markConversationAsRead = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    const { rows } = await client.query(
      `
      SELECT id
      FROM conversations
      WHERE id = $1
        AND (participant1_id = $2 OR participant2_id = $2)
      `,
      [conversationId, userId]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Access to conversation denied',
      });
    }

    const counts = await markConversationReadForUser(
      client,
      conversationId,
      userId
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Conversation marked as read',
      data: counts,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// send message
exports.sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const content = req.body.content || req.body.message;
    const { attachment_url, attachment_type, attachment_name } = req.body;
    const userId = req.user.id;
    const io = req.app.get('io');

    const trimmedContent = content ? String(content).trim() : null;

    if (!trimmedContent && !attachment_url) {
      return res.status(400).json({
        success: false,
        message: 'Message must have content or an attachment',
      });
    }

    // check if user is part of the conversation
    const conversationResult = await pool.query(
      `SELECT * FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $3)`,
      [conversationId, userId, userId]
    );
    if (conversationResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot send message',
      });
    }

    // create message
    const messageId = generateId();
    await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, content, attachment_url, attachment_type, attachment_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        messageId,
        conversationId,
        userId,
        trimmedContent || null,
        attachment_url || null,
        attachment_type || null,
        attachment_name || null,
      ]
    );

    // Update conversation's last_message_at
    await pool.query(
      `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    // Create notification for other participant
    const conversation = conversationResult.rows[0];
    const recipientId =
      conversation.participant1_id === userId
        ? conversation.participant2_id
        : conversation.participant1_id;

    // Get sender's name for notification
    const senderResult = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [userId]
    );
    const senderName = senderResult.rows[0]?.name || 'Unknown User';

    const notificationDescription = trimmedContent
      ? trimmedContent.substring(0, 100)
      : attachment_type === 'image'
        ? '📷 Image'
        : '📎 Attachment';

    const notificationId = generateId();
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, description, reference_id)
            VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        notificationId,
        recipientId,
        'message',
        `New message from ${senderName}`,
        notificationDescription,
        conversationId,
      ]
    );

    const newMessageResult = await pool.query(
      `SELECT m.*, u.name as sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = $1`,
      [messageId]
    );

    const newMessage = newMessageResult.rows[0];

    // Broadcast via Socket.IO to the room
    if (io) {
      io.to(conversationId).emit('new_message', newMessage);
    }

    // Send Web Push notification if the recipient is not actively viewing this conversation
    const presenceMap = io?.presenceMap;
    const recipientIsPresent = presenceMap
      ?.get(conversationId)
      ?.has(String(recipientId));

    if (!recipientIsPresent) {
      const pushBody = trimmedContent
        ? trimmedContent.substring(0, 120)
        : attachment_type === 'image'
          ? '📷 Sent an image'
          : '📎 Sent an attachment';

      // Fire-and-forget — does not block the HTTP response
      sendPushToUser(recipientId, {
        type: 'message',
        title: `New message from ${senderName}`,
        body: pushBody,
        url: `/homeFeed/chat-conversation/${conversationId}`,
        conversationId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

// verify if this is needed

// Upload attachment to Cloudinary and return the URL
exports.sendAttachment = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Check user is part of the conversation
    const conversationResult = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)`,
      [conversationId, userId]
    );
    if (conversationResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { buffer, mimetype, originalname } = req.file;
    const isImage = mimetype.startsWith('image/');
    const attachmentType = isImage ? 'image' : 'document';

    // Client-side size limits are enforced here too
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const MAX_DOC_BYTES = 5 * 1024 * 1024;
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
    if (buffer.length > maxBytes) {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${isImage ? '10' : '5'} MB.`,
      });
    }

    const uploadOptions = isImage
      ? {
          transformation: [
            { width: 1920, height: 1920, crop: 'limit' },
            { fetch_format: 'auto', quality: 'auto' },
          ],
        }
      : { resource_type: 'raw' };

    const result = await uploadToCloudinary(
      buffer,
      'neara-chat-attachments',
      uploadOptions
    );

    return res.status(200).json({
      success: true,
      data: {
        attachment_url: result.url,
        attachment_type: attachmentType,
        attachment_name: originalname,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getConversationById = async (req, res, next) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        c.id,
        l.id AS listing_id,
        l.title AS listing_title,

        CASE
          WHEN c.participant1_id = $1 THEN u2.id
          ELSE u1.id
        END AS partner_id,

        CASE
          WHEN c.participant1_id = $1 THEN u2.name
          ELSE u1.name
        END AS partner_name,

        CASE
          WHEN c.participant1_id = $1 THEN u2.profile_image_url
          ELSE u1.profile_image_url
        END AS partner_image_url

      FROM conversations c
      JOIN listings l ON l.id = c.listing_id
      JOIN users u1 ON u1.id = c.participant1_id
      JOIN users u2 ON u2.id = c.participant2_id
      WHERE c.id = $2
        AND ($1 = c.participant1_id OR $1 = c.participant2_id)
      `,
      [userId, conversationId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied',
      });
    }

    res.json({
      success: true,
      data: {
        id: rows[0].id,
        partner: {
          id: rows[0].partner_id,
          name: rows[0].partner_name,
          profile_image_url: rows[0].partner_image_url || null,
        },
        listing: {
          id: rows[0].listing_id,
          title: rows[0].listing_title,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteConversation = async (req, res, next) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const membership = await client.query(
      `
      SELECT id
      FROM conversations
      WHERE id = $1
        AND ($2 = participant1_id OR $2 = participant2_id)
      FOR UPDATE
      `,
      [conversationId, userId]
    );

    if (!membership.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied',
      });
    }

    await client.query(`DELETE FROM messages WHERE conversation_id = $1`, [
      conversationId,
    ]);

    const deleteConversationResult = await client.query(
      `DELETE FROM conversations WHERE id = $1`,
      [conversationId]
    );

    if (deleteConversationResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
