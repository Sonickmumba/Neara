const express = require('express');
const path = require('path');

// Load environment variables FIRST before any other imports
const dotenv = require('dotenv');
dotenv.config();
const jwt = require('jsonwebtoken');

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
// Authenticate sockets using JWT and attach user info to the socket
io.use((socket, next) => {
  const auth = socket.handshake && socket.handshake.auth;
  const token = auth && auth.token;

  if (!token) {
    return next(new Error('Authentication error: missing token'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = {
      id: payload.sub || payload.userId,
      conversations: Array.isArray(payload.conversations)
        ? payload.conversations
        : [],
    };

    if (!socket.user.id) {
      return next(new Error('Authentication error: invalid token payload'));
    }

    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);

  socket.on('join-conversation', (conversationId, ack) => {
    if (!conversationId) {
      if (ack) ack(false);
      return;
    }

    // Ensure the authenticated user is allowed to join this conversation
    if (
      !socket.user ||
      !Array.isArray(socket.user.conversations) ||
      !socket.user.conversations.includes(conversationId)
    ) {
      if (ack) ack(false);
      return;
    }

    socket.join(conversationId);
    if (ack) ack(true);
  });

  // Handle typing indicator
  socket.on('user_typing', (conversationId, userData) => {
    if (!conversationId || !userData) return;

    // Ensure the socket is authenticated and part of this conversation
    if (
      !socket.user ||
      !Array.isArray(socket.user.conversations) ||
      !socket.user.conversations.includes(conversationId)
    ) {
      return;
    }

    // Prevent user identity spoofing
    if (userData.userId && userData.userId !== socket.user.id) {
      return;
    }

    // Broadcast to all users in the conversation except the sender
    socket.to(conversationId).emit('user_typing', {
      userId: socket.user.id,
      userName: userData.userName,
      timestamp: Date.now(),
    });
  });

  // Handle stopped typing indicator
  socket.on('user_stopped_typing', (conversationId, userId) => {
    if (!conversationId || !userId) return;

    // Ensure the socket is authenticated and part of this conversation
    if (
      !socket.user ||
      !Array.isArray(socket.user.conversations) ||
      !socket.user.conversations.includes(conversationId)
    ) {
      return;
    }

    // Prevent user identity spoofing
    if (userId !== socket.user.id) {
      return;
    }

    // Broadcast to all users in the conversation except the sender
    socket.to(conversationId).emit('user_stopped_typing', { userId: socket.user.id });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Socket disconnected:', socket.id);
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
