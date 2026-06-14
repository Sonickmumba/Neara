const express = require('express');
const path = require('path');

// Load environment variables FIRST before any other imports
const dotenv = require('dotenv');
dotenv.config();

const validateProductionEnv = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const requiredCoreVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'JWT_SECRET',
    'CORS_ORIGIN',
    'FRONTEND_URL',
  ];
  const requiredTwilioVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_NUMBER',
  ];
  const requiredAfricasTalkingVars = [
    'AFRICASTALKING_USERNAME',
    'AFRICASTALKING_API_KEY',
  ];
  const smsProvider = String(process.env.SMS_PROVIDER || 'africas_talking')
    .trim()
    .toLowerCase();
  const hasEmailProvider =
    Boolean(String(process.env.RESEND_API_KEY || '').trim()) ||
    (Boolean(String(process.env.EMAIL_USER || '').trim()) &&
      Boolean(String(process.env.EMAIL_PASSWORD || '').trim()));

  const requiredSmsVars =
    smsProvider === 'twilio' ? requiredTwilioVars : requiredAfricasTalkingVars;

  const missingVars = [...requiredCoreVars, ...requiredSmsVars].filter((key) =>
    !String(process.env[key] || '').trim()
  );

  if (!['africas_talking', 'africastalking', 'twilio'].includes(smsProvider)) {
    missingVars.push('SMS_PROVIDER must be africas_talking or twilio');
  }

  if (!hasEmailProvider) {
    missingVars.push('RESEND_API_KEY or EMAIL_USER/EMAIL_PASSWORD');
  }

  if (process.env.SECURE_COOKIE !== 'true') {
    missingVars.push('SECURE_COOKIE=true');
  }

  if (process.env.SESSION_SECRET === 'your-secret-key') {
    missingVars.push('SESSION_SECRET must not use the default value');
  }

  if (missingVars.length > 0) {
    console.error(
      `❌ Startup blocked: missing required production env vars: ${missingVars.join(', ')}`
    );
    process.exit(1);
  }
};

validateProductionEnv();

const http = require('http');
const { Server } = require('socket.io');

const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');

const db = require('./config/database');
const PgSession = require('connect-pg-simple')(session);

const securityHeaders = require('./middleware/securityHeaders');
const requireJson = require('./middleware/requireJson');
const {
  csrfProtection,
  getCsrfToken,
} = require('./middleware/csrfProtection');
const {
  authLimiter,
  verificationLimiter,
  passwordResetLimiter,
  uploadLimiter,
  pushLimiter,
} = require('./middleware/rateLimits');

// imports routes here
const authRoutes = require('./routes/authRoutes');
const listingsRoutes = require('./routes/listingRoutes');
const usersRoutes = require('./routes/userRoutes');
const notificationsRoutes = require('./routes/notificationRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const activityRoutes = require('./routes/activityRoutes');
const imageRoutes = require('./routes/imageRoutes');
const pushRoutes = require('./routes/pushRoutes');

const app = express();
const server = http.createServer(app);

// Trust the first proxy hop (required on Render, Heroku, etc. for correct IP + HTTPS detection)
app.set('trust proxy', 1);
/* ======================
   SOCKET.IO SETUP
====================== */

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
});

app.set('io', io);

// cors for cross-origin requests here
app.use(securityHeaders);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'Retry-After',
    ],
  })
);

// cookie-parser and express-session for session management here
app.use(cookieParser());

const sessionMiddleware =
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: new PgSession({
      pool: db,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.SECURE_COOKIE === 'true',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    },
  });

// Middleware to parse JSON requests here
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Reject mutating requests with wrong Content-Type (CSRF hardening)
app.use(requireJson);

app.use('/api', sessionMiddleware);

// 🔐 Passport middleware here
app.use('/api', passport.initialize());
app.use('/api', passport.session());

app.get('/api/csrf-token', getCsrfToken);

io.engine.use(sessionMiddleware);
io.engine.use(passport.initialize());
io.engine.use(passport.session());

io.use((socket, next) => {
  if (!socket.request.isAuthenticated || !socket.request.isAuthenticated()) {
    return next(new Error('Unauthorized'));
  }

  return next();
});

app.use('/api', csrfProtection);

app.use(
  ['/api/auth/login', '/api/auth/register'],
  authLimiter
);
app.use(
  [
    '/api/auth/send-verification',
    '/api/auth/verify-email',
    '/api/auth/phone/send-code',
    '/api/auth/phone/verify-code',
  ],
  verificationLimiter
);
app.use(
  ['/api/auth/request-password-reset', '/api/auth/reset-password'],
  passwordResetLimiter
);
app.use(['/api/images/upload', /\/api\/conversations\/[^/]+\/attachments$/], uploadLimiter);
app.use(['/api/push/subscribe', '/api/push/unsubscribe'], pushLimiter);

// API Routes here
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/push', pushRoutes);

app.get('/api/status', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// ==========

/* ======================
   SOCKET EVENTS
====================== */

// Presence tracking (in-memory; swap for Redis adapter for multi-server deployments)
// Map<conversationId, Map<userId, Set<socketId>>>
const presenceMap = new Map();
// Map<socketId, { userId, conversationId }>
const socketMeta = new Map();

// Expose presenceMap on the io instance so controllers can gate push notifications
// without importing server.js (avoids circular deps).
io.presenceMap = presenceMap;

function addPresence(conversationId, userId, socketId) {
  if (!presenceMap.has(conversationId))
    presenceMap.set(conversationId, new Map());
  const conv = presenceMap.get(conversationId);
  if (!conv.has(userId)) conv.set(userId, new Set());
  conv.get(userId).add(socketId);
}

// Returns true when the user has no remaining sockets in this conversation
function removePresence(conversationId, userId, socketId) {
  const conv = presenceMap.get(conversationId);
  if (!conv) return false;
  const sockets = conv.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    conv.delete(userId);
    if (conv.size === 0) presenceMap.delete(conversationId);
    return true;
  }
  return false;
}

function getOnlineUserIds(conversationId, excludeUserId) {
  const conv = presenceMap.get(conversationId);
  if (!conv) return [];
  return Array.from(conv.keys()).filter((id) => id !== String(excludeUserId));
}

async function canAccessConversation(conversationId, userId) {
  const { rowCount } = await db.query(
    `
    SELECT 1
    FROM conversations
    WHERE id = $1
      AND (participant1_id = $2 OR participant2_id = $2)
    LIMIT 1
    `,
    [conversationId, userId]
  );

  return rowCount > 0;
}

io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);

  // Accepts { conversationId, userId } (new) or plain conversationId string (legacy)
  socket.on('join-conversation', async (data, ack) => {
    const conversationId =
      typeof data === 'object' ? data.conversationId : data;
    const userId = String(socket.request.user?.id || '');

    if (!conversationId || !userId) {
      if (ack) ack(false);
      return;
    }

    try {
      const allowed = await canAccessConversation(conversationId, userId);
      if (!allowed) {
        if (ack) ack(false);
        socket.emit('conversation_access_denied', { conversationId });
        return;
      }
    } catch (error) {
      console.error('Socket conversation access check failed:', error.message);
      if (ack) ack(false);
      return;
    }

    socket.join(conversationId);

    addPresence(conversationId, userId, socket.id);
    socketMeta.set(socket.id, { userId, conversationId });

    // Tell the joiner who else is already online in this conversation
    const onlineNow = getOnlineUserIds(conversationId, userId);
    socket.emit('presence_snapshot', onlineNow);

    // Tell everyone else that this user came online
    socket.to(conversationId).emit('partner_online', { userId });

    if (ack) ack(true);
  });

  // Handle typing indicator
  socket.on('user_typing', (conversationId, userData) => {
    if (!conversationId || !userData) return;
    const meta = socketMeta.get(socket.id);
    if (!meta || meta.conversationId !== conversationId) return;

    // Broadcast to all users in the conversation except the sender
    socket.to(conversationId).emit('user_typing', {
      userId: meta.userId,
      userName: userData.userName,
      timestamp: Date.now(),
    });
  });

  // Handle stopped typing indicator
  socket.on('user_stopped_typing', (conversationId, userId) => {
    if (!conversationId || !userId) return;
    const meta = socketMeta.get(socket.id);
    if (!meta || meta.conversationId !== conversationId) return;

    // Broadcast to all users in the conversation except the sender
    socket.to(conversationId).emit('user_stopped_typing', {
      userId: meta.userId,
    });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Socket disconnected:', socket.id);

    const meta = socketMeta.get(socket.id);
    if (meta) {
      const { userId, conversationId } = meta;
      const wasLastSocket = removePresence(conversationId, userId, socket.id);
      socketMeta.delete(socket.id);

      // Only broadcast offline when the user's last socket leaves (multi-tab safe)
      if (wasLastSocket) {
        socket.to(conversationId).emit('partner_offline', { userId });
      }
    }
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

app.use((err, req, res, next) => {
  if (!req.path.startsWith('/api')) return next(err);

  console.error(err);

  const status =
    err.name === 'MulterError' ? 400 : err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error',
  });
});

// Serve React frontend
app.use(express.static(path.join(__dirname, 'views/dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/dist', 'index.html'));
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`API Server is running at http://localhost:${PORT}.`);
});
