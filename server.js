const express = require('express');
const path = require('path');

// const http = require('http');
// const { Server } = require('socket.io');

const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');

const dotenv = require('dotenv');
const db = require('./config/database');

const securityHeaders = require('./middleware/securityHeaders');

// imports routes here
const authRoutes = require('./routes/authRoutes');
const listingsRoutes = require('./routes/listingRoutes');
const usersRoutes = require('./routes/userRoutes');
const notificationsRoutes = require('./routes/notificationRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

// Load environment variables
dotenv.config();

const app = express();




// const server = http.createServer(app);
/* ======================
   SOCKET.IO SETUP
====================== */

// const io = new Server(server, {
//   cors: {
//     origin: 'http://localhost:5173',
//     credentials: true,
//   },
// });

// app.set('io', io);


// cors for cross-origin requests here
app.use(securityHeaders);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  })
);

// cookie-parser and express-session for session management here
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
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


app.get('/api/status', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// ==========





/* ======================
   SOCKET EVENTS
====================== */
// io.on('connection', (socket) => {
//   console.log('🟢 Socket connected:', socket.id);

//   socket.on('join-conversation', (conversationId, ack) => {
//     socket.join(conversationId);
//     console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
//     if (ack) ack(true);
//   });

//   socket.on('send-message', ({ conversationId, message }) => {
//     io.to(conversationId).emit('new-message', message);
//   });

//   socket.on('disconnect', () => {
//     console.log('🔴 Socket disconnected:', socket.id);
//   });
// });

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
app.listen(PORT, () => {
  console.log(`API Server is running at http://localhost:${PORT}.`);
}); 