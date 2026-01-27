# LocalLoop Backend API

A complete Express.js backend for the LocalLoop neighborhood community platform.

## 📋 Features

- **User Authentication** - JWT-based auth with bcrypt password hashing
- **Listings Management** - Create, read, update, delete listings (offers/needs)
- **Real-time Messaging** - Conversations between users
- **Trade System** - Propose, accept, and manage trades
- **Reviews & Ratings** - Rate users after completed trades
- **Notifications** - Real-time notifications for all activities
- **Location-based Search** - Find listings nearby using geolocation

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts and profiles
- **listings** - Posts for offers and needs
- **conversations** - Chat conversations between users
- **messages** - Individual chat messages
- **trades** - Trade proposals and agreements
- **reviews** - User ratings and reviews
- **interests** - Predefined user interests
- **user_interests** - User-interest relationships
- **notifications** - User notifications

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- postgres (v8 or higher)

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create database:
```bash
mysql -u root -p
CREATE DATABASE localloop;
exit;
```

3. Import schema:
```bash
mysql -u root -p localloop < database/schema.sql
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Start server:
```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `GET /api/auth/user/userId` = Get user by id (protected)

### Listings
- `GET /api/listings` - Get all listings (with filters)
- `GET /api/listings/:id` - Get listing by ID
- `GET /api/listings/user/:userId` - Get user's listings
- `POST /api/listings` - Create listing (protected)
- `PUT /api/listings/:id` - Update listing (protected)
- `DELETE /api/listings/:id` - Delete listing (protected)

### Conversations
- `GET /api/conversations` - Get user's conversations (protected)
- `POST /api/conversations` - Get or create conversation (protected)
- `GET /api/conversations/:conversationId/messages` - Get messages (protected)
- `POST /api/conversations/messages` - Send message (protected)

### Trades
- `GET /api/trades` - Get user's trades (protected)
- `GET /api/trades/:id` - Get trade by ID (protected)
- `POST /api/trades` - Create trade proposal (protected)
- `PATCH /api/trades/:id/status` - Update trade status (protected)

### Reviews
- `GET /api/reviews/user/:userId` - Get user's reviews
- `POST /api/reviews` - Create review (protected)

### Notifications
- `GET /api/notifications` - Get notifications (protected)
- `GET /api/notifications/unread-count` - Get unread count (protected)
- `PATCH /api/notifications/:id/read` - Mark as read (protected)
- `PATCH /api/notifications/read-all` - Mark all as read (protected)
- `DELETE /api/notifications/:id` - Delete notification (protected)

## 🔐 Authentication

Protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 📝 Example Requests

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "neighborhood": "Downtown",
    "interests": ["int-1", "int-2"]
  }'
```

### Create Listing
```bash
curl -X POST http://localhost:5000/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "offer",
    "category": "skills",
    "title": "Free guitar lessons",
    "description": "Teaching beginners on weekends"
  }'
```

### Search Listings
```bash
# Get all offers in skills category
curl "http://localhost:5000/api/listings?type=offer&category=skills"

# Search with location
curl "http://localhost:5000/api/listings?lat=40.7580&lng=-73.9855&radius=5"

# Search by text
curl "http://localhost:5000/api/listings?search=guitar"
```

## 🛠️ Development

### Project Structure
```
backend/
├── config/
│   └── database.js          # Database connection
├── controllers/
│   ├── authController.js    # Auth logic
│   ├── listingsController.js
│   ├── conversationsController.js
│   ├── tradesController.js
│   ├── reviewsController.js
│   └── notificationsController.js
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── errorHandler.js      # Global error handling
├── routes/
│   ├── auth.js
│   ├── listings.js
│   ├── conversations.js
│   ├── trades.js
│   ├── reviews.js
│   └── notifications.js
├── utils/
│   └── helpers.js           # Helper functions
├── database/
│   └── schema.sql           # Database schema
├── .env.example
├── package.json
└── server.js                # Main server file
```

## 🔧 Environment Variables

```env
PORT=5000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_secure_db_password
DB_NAME=localloop
DB_SSL=true

# JWT Configuration
JWT_SECRET=your_very_secure_random_jwt_secret_key_at_least_32_characters
JWT_REFRESH_SECRET=your_different_very_secure_random_refresh_secret_key
JWT_EXPIRES_IN=15m

# CORS
CORS_ORIGIN=https://yourdomain.com

# Email (for password reset - implement later)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# OTP Service
TEXTFLOW_API_KEY=your_textflow_api_key

# Redis (for production scaling)
REDIS_URL=redis://localhost:6379
```

## � Production Security Checklist

### ✅ Implemented Security Features
- [x] **Rate Limiting**: API, auth, and OTP endpoints protected
- [x] **Security Headers**: Helmet.js with CSP, HSTS, XSS protection
- [x] **Password Security**: bcrypt hashing with salt rounds 12
- [x] **Strong Password Requirements**: 8+ chars, uppercase, lowercase, numbers
- [x] **JWT with HTTP-only Cookies**: XSS protection
- [x] **Refresh Token System**: Secure token rotation
- [x] **Input Validation**: express-validator on all inputs
- [x] **Error Handling**: Secure error responses (no data leakage)
- [x] **CORS Configuration**: Environment-based origin control
- [x] **Password Reset**: Secure token-based reset system

### 🔧 Pre-Production Setup Required
- [ ] **Environment Variables**: Set all production secrets
- [ ] **Database SSL**: Enable SSL connections
- [ ] **Redis Setup**: For session storage and rate limiting
- [ ] **Email Service**: Implement SMTP for password reset emails
- [ ] **Monitoring**: Set up error logging and monitoring
- [ ] **SSL Certificate**: HTTPS certificate for production domain
- [ ] **Database Backup**: Automated backup strategy
- [ ] **Load Testing**: Test rate limits and performance

### 🚨 Security Best Practices
1. **Never commit secrets** to version control
2. **Use environment variables** for all configuration
3. **Enable SSL/TLS** in production
4. **Regular dependency updates** and security audits
5. **Monitor authentication logs** for suspicious activity
6. **Implement account lockout** after failed attempts
7. **Use prepared statements** (already implemented with pg)
8. **Regular security testing** and penetration testing

## ��📊 ERD Overview

```
users (1) ──── (M) listings
  │                   │
  │                   │
  └──── (M) user_interests (M) ──── interests
  │
  ├──── (M) messages
  │         │
  │         └──── (M) conversations ──── (1) listings
  │
  ├──── (M) trades ──── (1) listings
  │         │
  │         └──── (M) reviews
  │
  └──── (M) notifications
```

## 🚨 Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

## 📄 License

This project is part of the LocalLoop application.
