# Neara — Neighborhood Trade & Community Platform

**Neara** is a hyperlocal community platform that connects neighbors to barter goods, exchange services, and share skills — all within their neighborhood. Think of it as a social marketplace where trust, community, and mutual support come first. Instead of buying new, neighbors trade what they have for what they need: a bag of lemons for help fixing a fence, guitar lessons in exchange for home-cooked meals, or a spare bicycle for childcare hours.

Neara makes bartering easy, safe, and social — turning neighbors into a network.

---

## ✅ Currently Implemented Features

### 🔐 Authentication & Identity
- **Local Email/Password Auth** — Secure registration and login with bcrypt password hashing (12 salt rounds)
- **Google OAuth2 Sign-In** — One-tap signup/login via Google account
- **Facebook OAuth Sign-In** — One-tap signup/login via Facebook account
- **JWT Authentication** — Stateless HTTP-only cookie-based tokens with refresh token rotation
- **Email Verification** — OTP-based email confirmation on signup
- **Phone Verification** — SMS OTP via Twilio for phone number confirmation
- **Password Reset** — Secure token-based forgot-password flow
- **Social Account Linking** — Link multiple OAuth providers to a single Neara account

### 🏘️ Listings & Discovery
- **Create Listings** — Post offers (things you have) or needs (things you want)
- **Multi-photo Upload** — Attach images to listings via Cloudinary
- **Category Filtering** — Browse by category (skills, goods, services, etc.)
- **Text Search** — Full-text search across listing titles and descriptions
- **Location-based Search** — Find listings nearby using geolocation (lat/lng radius)
- **Listing Management** — Edit and delete your own listings
- **Favorites/Wishlist** — Save listings for later with a favorites system

### 💬 Messaging & Conversations
- **In-app Messaging** — Direct chat between users about a listing
- **Conversation Threads** — Organized per-listing conversations
- **Real-time Chat** — Powered by Socket.IO for instant message delivery

### 🤝 Trades
- **Trade Proposals** — Propose a trade directly from a listing
- **Trade Negotiation** — Counter-offer and discuss terms in-app
- **Trade Status Management** — Accept, reject, or cancel trades
- **Trade History** — View all past and active trades

### ⭐ Reviews & Reputation
- **Post-trade Reviews** — Rate and review users after a completed trade
- **Star Ratings** — 1–5 star rating system with written feedback
- **Reputation Badges** — Earn badges based on trade activity and ratings
- **User Stats** — Public profile showing trade count, rating, and member history

### 👤 User Profiles
- **Profile Management** — Update name, bio, location, and profile picture
- **User Settings** — Manage account preferences and notifications
- **Interest Selection** — Choose interests to personalize the feed
- **Account Deletion** — Users can permanently delete their own account
- **Public Profile** — View another user's listings, reviews, and badges

### 🔔 Notifications
- **In-app Notifications** — Real-time alerts for trade updates, messages, and reviews
- **Unread Count Badge** — Live unread notification counter
- **Mark Read / Mark All Read** — Manage notification state
- **Delete Notifications** — Clean up old alerts

### 🗺️ Map View
- **Interactive Map** — Visualize nearby listings on a map
- **Location Permission Flow** — Onboarding step to enable location-based features

### 📊 Activity Feed
- **Recent Activity** — See your own recent trades, messages, and listings
- **Activity Stats** — Summary of your engagement on the platform

### 🔒 Security
- **Rate Limiting** — Protects API, auth, and OTP endpoints from abuse
- **Security Headers** — Helmet.js with CSP, HSTS, and XSS protection
- **Input Validation** — Server-side validation on all inputs via express-validator
- **CORS Configuration** — Environment-based origin control
- **Provider Allowlist** — OAuth providers are allowlisted to prevent open-redirect attacks

---

## 🔮 Future Features

### 💰 Monetization Options *(for sustainability)*
- **Premium Membership** — Ad-free experience, unlimited listings, priority support, and advanced analytics for power users
- **Promoted Listings** — Boost a listing's visibility to reach more neighbors in the feed
- **Local Business Partnerships** — Sponsored content and featured placements from neighborhood shops and local service providers
- **Freemium Model** — Core features remain free; premium upgrades available for advanced capabilities

### 💳 Payment & Value Exchange
- **Neara Credits** — In-app virtual currency to simplify bartering when direct item swaps aren't equal in value
- **Multiple Trade Options** — Support barter, cash, Neara Credits, or any combination of the three
- **Escrow Service** — Hold funds or credits in escrow during high-value trades to protect both parties
- **Digital Receipts** — Automatically generated transaction records for every completed trade
- **Tips / Donations** — Allow community members to tip each other in appreciation for great service or generosity

### 🔔 Notifications & Communication
- **Push Notifications** — Real-time mobile push alerts for new messages, trade updates, and nearby listing activity
- **Email Digests** — Weekly summary emails highlighting nearby listings, trade activity, and community news
- **Video / Voice Chat** — Built-in video and voice calling for complex skill-sharing negotiations or meetup coordination

### 🌐 Social & Community Features
- **Events Calendar** — Organize and discover neighborhood yard sales, swap meets, skill-sharing workshops, and community clean-ups
- **Community Groups** — Create or join interest-based groups (gardening, parenting, DIY, cooking, fitness, etc.)
- **User Following** — Follow neighbors you frequently trade with to see their new listings first
- **Community Feed** — Neighborhood announcements, local news, and trade success stories

### 🎯 Convenience & UX
- **Scheduling System** — Built-in calendar tool to schedule pickups, deliveries, or meetups directly inside the app
- **QR Code Profiles** — Generate a personal QR code to instantly share your profile or a listing in person
- **Video Support** — Upload short demo videos alongside listings (e.g., showing how a skill or product works)
- **Report & Block** — Enhanced moderation tools to report listings and block users for a safer community

---

## 🗄️ Database Schema

### Core Tables
| Table | Description |
|---|---|
| `users` | User accounts and profile data |
| `listings` | Offers and needs posted by users |
| `conversations` | Chat threads between users |
| `messages` | Individual messages within a conversation |
| `trades` | Trade proposals and their lifecycle |
| `reviews` | Post-trade ratings and written feedback |
| `interests` | Predefined interest categories |
| `user_interests` | Many-to-many: users ↔ interests |
| `notifications` | In-app notification records |
| `user_social_accounts` | Linked OAuth provider accounts (Google, Facebook) |
| `phone_verification_codes` | OTP codes for phone number verification |

### ERD Overview
```
users (1) ──── (M) listings
  │                   │
  ├──── (M) user_interests (M) ──── interests
  │
  ├──── (M) messages
  │         └──── conversations ──── listings
  │
  ├──── (M) trades ──── listings
  │         └──── (M) reviews
  │
  ├──── (M) notifications
  └──── (M) user_social_accounts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v13 or higher)

### Installation

1. **Clone the repository and install dependencies:**
```bash
git clone https://github.com/Sonickmumba/Neara.git
cd Neara
npm install
```

2. **Set up the database:**
```bash
psql -U postgres -c "CREATE DATABASE neara;"
psql -U postgres -d neara -f db/schema.sql
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration (see Environment Variables below)
```

4. **Initialize the database:**
```bash
npm run db:init
```

5. **Start the server:**
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

6. **Start the frontend:**
```bash
cd views
npm install
npm run dev
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register with email & password | — |
| `POST` | `/api/auth/login` | Login with email & password | — |
| `GET` | `/api/auth/google` | Initiate Google OAuth2 flow | — |
| `GET` | `/api/auth/google/callback` | Google OAuth2 callback | — |
| `GET` | `/api/auth/facebook` | Initiate Facebook OAuth flow | — |
| `GET` | `/api/auth/facebook/callback` | Facebook OAuth callback | — |
| `GET` | `/api/auth/me` | Get current user | ✅ |
| `GET` | `/api/auth/user/:id` | Get user by ID | ✅ |
| `POST` | `/api/auth/logout` | Logout and clear session | ✅ |
| `POST` | `/api/auth/send-verification-email` | Send email OTP | ✅ |
| `POST` | `/api/auth/verify-email` | Confirm email OTP | — |
| `POST` | `/api/auth/send-phone-code` | Send SMS OTP | ✅ |
| `POST` | `/api/auth/verify-phone` | Confirm SMS OTP | ✅ |
| `POST` | `/api/auth/request-password-reset` | Request password reset link | — |
| `POST` | `/api/auth/reset-password` | Submit new password | — |
| `POST` | `/api/auth/refresh-token` | Rotate JWT refresh token | — |

### Listings
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/listings` | Get listings (with search/filter/geo) | — |
| `GET` | `/api/listings/:id` | Get listing by ID | — |
| `GET` | `/api/listings/user/:userId` | Get a user's listings | — |
| `POST` | `/api/listings` | Create a new listing | ✅ |
| `PUT` | `/api/listings/:id` | Update a listing | ✅ |
| `DELETE` | `/api/listings/:id` | Delete a listing | ✅ |

### Conversations & Messages
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/conversations` | Get user's conversations | ✅ |
| `POST` | `/api/conversations` | Get or start a conversation | ✅ |
| `GET` | `/api/conversations/:id/messages` | Get messages in a conversation | ✅ |
| `POST` | `/api/conversations/messages` | Send a message | ✅ |

### Trades
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/trades` | Get user's trades | ✅ |
| `GET` | `/api/trades/:id` | Get trade by ID | ✅ |
| `POST` | `/api/trades` | Propose a trade | ✅ |
| `PATCH` | `/api/trades/:id/status` | Update trade status | ✅ |

### Reviews
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/reviews/user/:userId` | Get a user's reviews | — |
| `POST` | `/api/reviews` | Submit a review | ✅ |

### Notifications
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/notifications` | Get all notifications | ✅ |
| `GET` | `/api/notifications/unread-count` | Get unread count | ✅ |
| `PATCH` | `/api/notifications/:id/read` | Mark one as read | ✅ |
| `PATCH` | `/api/notifications/read-all` | Mark all as read | ✅ |
| `DELETE` | `/api/notifications/:id` | Delete a notification | ✅ |

### Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/users/:id/profile` | Get public user profile | — |
| `PUT` | `/api/users/:id/profile` | Update profile | ✅ |
| `GET` | `/api/users/:id/settings` | Get user settings | ✅ |
| `PUT` | `/api/users/:id/settings` | Update settings | ✅ |
| `GET` | `/api/users/:id/stats` | Get user activity stats | — |
| `GET` | `/api/users/:id/badges` | Get user badges | — |
| `DELETE` | `/api/users/:id` | Delete account | ✅ |

### Favorites
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/favorites` | Get saved favorites | ✅ |
| `POST` | `/api/favorites` | Save a listing | ✅ |
| `DELETE` | `/api/favorites/:listingId` | Remove from favorites | ✅ |

### Images
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/images/upload` | Upload image to Cloudinary | ✅ |
| `DELETE` | `/api/images/:publicId` | Delete image from Cloudinary | ✅ |

### Activity
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/activity` | Get recent activity | ✅ |
| `GET` | `/api/activity/stats` | Get activity stats | ✅ |

---

## 🛠️ Project Structure

```
Neara/
├── config/
│   ├── database.js              # PostgreSQL connection pool
│   └── passport.js              # Passport.js strategies (local, Google, Facebook)
├── controllers/
│   ├── authController.js        # Registration, login, OTP, OAuth, password reset
│   ├── listingsController.js    # Listing CRUD and search
│   ├── conversationsController.js
│   ├── tradesController.js
│   ├── reviewsController.js
│   ├── usersController.js       # Profiles, settings, badges, stats
│   ├── favoritesController.js
│   ├── notificationsController.js
│   └── activitiesController.js
├── middleware/
│   ├── auth.js                  # JWT session guard
│   ├── validation.js            # express-validator rule sets
│   └── securityHeaders.js       # Helmet.js security headers
├── routes/
│   ├── authRoutes.js
│   ├── listingRoutes.js
│   ├── conversationRoutes.js
│   ├── tradeRoutes.js
│   ├── reviewRoutes.js
│   ├── userRoutes.js
│   ├── favoriteRoutes.js
│   ├── notificationRoutes.js
│   ├── imageRoutes.js
│   └── activityRoutes.js
├── utils/
│   ├── helpers.js               # ID generation, utilities
│   ├── emailService.js          # Nodemailer email sender
│   ├── smsService.js            # Twilio SMS sender
│   ├── imageService.js          # Cloudinary helpers
│   └── notificationsHelpers.js
├── db/
│   ├── schema.sql               # Full database schema
│   └── initDb.js                # DB initializer script
├── views/                       # React + Vite frontend
│   ├── src/
│   │   ├── features/
│   │   │   ├── loginSignup/     # Auth screens (email, Google, Facebook)
│   │   │   ├── homeScreen/      # Feed, favorites, listing details
│   │   │   ├── chat/            # Messaging UI
│   │   │   ├── trade/           # Trade management UI
│   │   │   ├── user/            # Profile and settings
│   │   │   ├── mapView/         # Map listing view
│   │   │   ├── interest/        # Interest selection onboarding
│   │   │   └── splash/          # Welcome and location screens
│   │   └── components/          # Shared UI components
│   └── package.json
├── server.js                    # Express + Socket.IO server
└── package.json
```

---

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_secure_db_password
DB_NAME=neara
DB_SSL=false

# JWT
JWT_SECRET=your_very_secure_random_jwt_secret_key_at_least_32_characters
JWT_REFRESH_SECRET=your_different_very_secure_random_refresh_secret_key
JWT_EXPIRES_IN=15m

# Session
SESSION_SECRET=your_session_secret

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# OTP Security
OTP_SECRET=your_otp_secret

# Image Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:5173
```

> **Note:** Google and Facebook OAuth are optional. The app degrades gracefully and hides those login buttons if the credentials are not configured.

---

## 🔐 Security

### ✅ Implemented Security Features
- [x] **Rate Limiting** — API, auth, and OTP endpoints protected from abuse
- [x] **Security Headers** — Helmet.js with CSP, HSTS, and XSS protection
- [x] **Password Security** — bcrypt hashing with 12 salt rounds
- [x] **Strong Password Policy** — 8+ chars, uppercase, lowercase, numbers required
- [x] **JWT with HTTP-only Cookies** — Protects tokens from XSS
- [x] **Refresh Token Rotation** — Short-lived access tokens with secure refresh
- [x] **Input Validation** — express-validator rules on all inputs
- [x] **Secure Error Responses** — No internal details leaked to clients
- [x] **CORS Configuration** — Environment-based origin allowlist
- [x] **Password Reset** — Secure token-based reset with expiry
- [x] **OAuth Provider Allowlist** — Prevents open-redirect via social login
- [x] **Prepared Statements** — SQL injection protection via `pg` parameterized queries

### 🔧 Pre-Production Checklist
- [ ] Set all secrets as environment variables (never hardcode)
- [ ] Enable PostgreSQL SSL (`DB_SSL=true`)
- [ ] Configure Redis for session storage and rate limiting at scale
- [ ] Set up production SMTP for reliable email delivery
- [ ] Add error monitoring (e.g., Sentry)
- [ ] Obtain SSL/TLS certificate (HTTPS)
- [ ] Set up automated database backups
- [ ] Load-test rate limits and performance under traffic

### 🚨 Security Best Practices
1. **Never commit secrets** to version control — use `.env` files and secret managers
2. **Enable SSL/TLS** in production for all connections
3. **Keep dependencies updated** and run `npm audit` regularly
4. **Monitor authentication logs** for suspicious activity patterns
5. **Use environment-specific CORS origins** — never use `*` in production

---

## 🚨 Error Handling

All API endpoints return consistent JSON error responses:
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

---

## 📝 Example API Requests

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePass1",
    "phone": "+260971234567",
    "neighborhood": "Riverside",
    "interests": ["int-1", "int-2"]
  }'
```

### Create a Listing
```bash
curl -X POST http://localhost:5000/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "offer",
    "category": "skills",
    "title": "Free guitar lessons",
    "description": "Happy to teach beginners on weekends"
  }'
```

### Search Listings by Location
```bash
# By text
curl "http://localhost:5000/api/listings?search=guitar"

# By category
curl "http://localhost:5000/api/listings?type=offer&category=skills"

# By geolocation (5km radius)
curl "http://localhost:5000/api/listings?lat=-15.4166&lng=28.2833&radius=5"
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Frontend** | React 19, Vite, Tailwind CSS, Redux Toolkit |
| **Database** | PostgreSQL |
| **Auth** | Passport.js (Local, Google OAuth2, Facebook OAuth) |
| **Real-time** | Socket.IO |
| **Image Storage** | Cloudinary |
| **Email** | Nodemailer |
| **SMS** | Twilio |
| **Validation** | express-validator |
| **Security** | Helmet.js, bcrypt, JWT |

---

## 📄 License

This project is licensed under the MIT License. See [MIT.md](./MIT.md) for details.
