const express = require('express');
const path = require('path');

// Load environment variables FIRST before any other imports
const dotenv = require('dotenv');
dotenv.config();

const validateProductionEnv = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const requiredTwilioVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_NUMBER',
  ];

  const missingVars = requiredTwilioVars.filter(
    (key) => !String(process.env[key] || '').trim()
  );

  if (missingVars.length > 0) {
    console.error(
      `❌ Startup blocked: missing required Twilio env vars in production: ${missingVars.join(', ')}`
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

const securityHeaders = require('./middleware/securityHeaders');

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

const app = express();
const server = http.createServer(app);
/* ======================
   SOCKET.IO SETUP
====================== */

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

app.set('io', io);

// cors for cross-origin requests here
app.use(securityHeaders);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true, // Changed to true to ensure session is saved even if unmodified
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// 🔐 Passport middleware here
app.use(passport.initialize());
app.use(passport.session());

// Middleware to parse JSON requests here
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.get('/api/status', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  const emailService = require('./utils/emailService');
  try {
    const result = await emailService.sendVerificationEmail(
      'kingellie.mumba@gmail.com',
      '123456'
    );
    res.json({ success: result, message: 'Test email sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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

io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);

  // Accepts { conversationId, userId } (new) or plain conversationId string (legacy)
  socket.on('join-conversation', (data, ack) => {
    const conversationId =
      typeof data === 'object' ? data.conversationId : data;
    const userId = typeof data === 'object' ? String(data.userId || '') : null;

    if (!conversationId) {
      if (ack) ack(false);
      return;
    }

    socket.join(conversationId);

    if (userId) {
      addPresence(conversationId, userId, socket.id);
      socketMeta.set(socket.id, { userId, conversationId });

      // Tell the joiner who else is already online in this conversation
      const onlineNow = getOnlineUserIds(conversationId, userId);
      socket.emit('presence_snapshot', onlineNow);

      // Tell everyone else that this user came online
      socket.to(conversationId).emit('partner_online', { userId });
    }

    if (ack) ack(true);
  });

  // Handle typing indicator
  socket.on('user_typing', (conversationId, userData) => {
    if (!conversationId || !userData) return;

    // Broadcast to all users in the conversation except the sender
    socket.to(conversationId).emit('user_typing', {
      userId: userData.userId,
      userName: userData.userName,
      timestamp: Date.now(),
    });
  });

  // Handle stopped typing indicator
  socket.on('user_stopped_typing', (conversationId, userId) => {
    if (!conversationId || !userId) return;

    // Broadcast to all users in the conversation except the sender
    socket.to(conversationId).emit('user_stopped_typing', { userId });
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

// 404 error handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`API Server is running at http://localhost:${PORT}.`);
});
