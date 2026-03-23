# Neara

A full-stack neighborhood community platform where people can share skills, exchange goods, negotiate trades, and communicate in real time.

---

## Tech Stack

**Backend**
- Node.js + Express 5
- PostgreSQL (via `pg` connection pool, raw SQL)
- Passport.js — Local, Google OAuth 2.0, Facebook OAuth
- Session-based auth with HTTP-only cookies (`express-session`)
- Socket.io — real-time messaging and presence tracking
- Web Push API (`web-push` + VAPID) — browser push notifications
- Cloudinary — image and file storage
- Nodemailer — transactional email
- Twilio — SMS verification
- Helmet — security headers
- express-validator — request validation

**Frontend**
- React 19 + Vite
- React Router 7
- Redux Toolkit
- Tailwind CSS
- Axios
- Socket.io-client
- emoji-picker-react
- sonner (toasts)
- Vitest + React Testing Library

---

## Features

- **Authentication** — local sign-up/login, Google and Facebook OAuth, email verification, password reset, phone (SMS) verification
- **Listings** — create, browse, search, and filter offers and needs by category, location, and keyword
- **Real-time Chat** — conversations between users with typing indicators, presence tracking, message attachments (images and documents), and emoji picker
- **Push Notifications** — browser push notifications via Web Push API; only delivered when the recipient is not actively viewing the conversation
- **Trade System** — propose, negotiate, accept, and complete trades linked to listings
- **Reviews & Ratings** — rate trading partners after a completed trade
- **Favorites** — save listings for later
- **Activity Feed** — track recent activity across the platform
- **Avatar Upload** — profile photo upload with Cloudinary storage
- **Location-based Search** — find listings nearby using geolocation
- **Settings** — notification preferences, privacy controls

---

## Project Structure

```
Neara/
├── config/
│   ├── database.js              # PostgreSQL connection pool
│   └── passport.js              # Passport strategies (local, Google, Facebook)
├── controllers/
│   ├── authController.js
│   ├── conversationsController.js
│   ├── listingsController.js
│   ├── notificationsController.js
│   ├── pushController.js        # Web Push subscribe/unsubscribe/VAPID key
│   ├── reviewsController.js
│   ├── tradesController.js
│   ├── usersController.js
│   ├── favoritesController.js
│   └── activitiesController.js
├── db/
│   ├── schema.sql               # Full database schema
│   └── initDb.js                # DB initialisation script
├── middleware/
│   ├── auth.js                  # Session auth guard
│   ├── requireJson.js           # Content-Type CSRF guard
│   ├── securityHeaders.js       # Helmet configuration
│   └── validation.js            # express-validator rules
├── routes/
│   ├── authRoutes.js
│   ├── conversationRoutes.js
│   ├── listingRoutes.js
│   ├── notificationRoutes.js
│   ├── pushRoutes.js
│   ├── reviewRoutes.js
│   ├── tradeRoutes.js
│   ├── userRoutes.js
│   ├── favoriteRoutes.js
│   ├── activityRoutes.js
│   └── imageRoutes.js
├── utils/
│   ├── emailService.js          # Nodemailer helpers
│   ├── imageService.js          # Cloudinary upload/delete + multer
│   ├── pushService.js           # Web Push delivery (fire-and-forget)
│   ├── smsService.js            # Twilio SMS
│   ├── notificationsHelpers.js
│   └── helpers.js
├── views/                       # React frontend (Vite)
│   ├── public/
│   │   └── sw.js                # Service worker (push + notification click)
│   └── src/
│       ├── features/
│       │   ├── chat/            # ChatConversationScreen, MessageListScreen
│       │   ├── loginSignup/     # Auth flows + Redux slice
│       │   ├── homeScreen/      # Listings browse
│       │   ├── trade/           # Trade negotiation, review-rating
│       │   ├── user/            # UserSettings, UserProfile
│       │   ├── favorites/
│       │   ├── mapView/
│       │   ├── interest/
│       │   └── splash/
│       ├── hooks/
│       │   ├── usePushNotifications.js  # SW registration + subscribe/unsubscribe
│       │   └── usePullToRefresh.js
│       ├── components/          # Shared UI components
│       ├── services/            # Axios API client
│       └── store/               # Redux store setup
├── .env                         # Local environment variables (never commit)
├── server.js                    # Express + Socket.io entry point
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1 — Clone and install

```bash
git clone https://github.com/Sonickmumba/Neara.git
cd Neara
npm install                            # backend deps
cd views && npm install && cd ..       # frontend deps
```

### 2 — Create the database

```bash
psql -U postgres -c "CREATE DATABASE Neara;"
psql -U postgres -d Neara -f db/schema.sql
```

### 3 — Configure environment

Create a `.env` file in the project root:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=Neara
DATABASE_URL=postgresql://postgres:your_db_password@localhost:5432/Neara

# Session
SESSION_SECRET=change_this_to_a_long_random_string

# JWT (used for email verification tokens)
JWT_SECRET=change_this_to_another_long_random_string
JWT_EXPIRES_IN=5m

# CORS
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Set to true only when running behind HTTPS (enables HSTS + Secure cookie)
SECURE_COOKIE=false

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback

# Email (Nodemailer / Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# SMS (Twilio)
TEXTFLOW_API_KEY=your_textflow_api_key
TEXTFLOW_SENDER_ID=Neara
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

# Cloudinary (image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Web Push (VAPID) — generate once, never rotate
# Run: node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k);"
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:you@example.com
```

### 4 — Run in development

Two terminals:

```bash
# Terminal 1 — backend (serves API + built frontend on :3000)
npm run dev

# Terminal 2 — frontend dev server with HMR (on :5173)
cd views && npm run dev
```

Or run the built frontend through Express:

```bash
cd views && npm run build && cd ..
npm start      # http://localhost:3000
```

---

## API Endpoints

All mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) must use `Content-Type: application/json` (or `multipart/form-data` for file uploads). Requests with other content types are rejected with `415`.

Protected routes require an active session (log in first via `/api/auth/login`).

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register with email + password |
| POST | `/api/auth/login` | — | Login (sets session cookie) |
| POST | `/api/auth/logout` | — | Destroy session |
| GET | `/api/auth/me` | ✓ | Get current user |
| GET | `/api/auth/google` | — | Start Google OAuth flow |
| GET | `/api/auth/google/callback` | — | Google OAuth callback |
| GET | `/api/auth/facebook` | — | Start Facebook OAuth flow |
| GET | `/api/auth/facebook/callback` | — | Facebook OAuth callback |
| POST | `/api/auth/verify-email` | — | Verify email with token |
| POST | `/api/auth/resend-verification` | — | Resend verification email |
| POST | `/api/auth/forgot-password` | — | Send password reset email |
| POST | `/api/auth/reset-password` | — | Reset password with token |
| POST | `/api/auth/change-password` | ✓ | Change password |
| POST | `/api/auth/phone/send-code` | ✓ | Send SMS verification code |
| POST | `/api/auth/phone/verify` | ✓ | Verify SMS code |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/profile` | ✓ | Get own profile |
| PATCH | `/api/users/profile` | ✓ | Update profile fields |
| POST | `/api/users/avatar` | ✓ | Upload profile photo (multipart) |
| GET | `/api/users/:userId` | ✓ | Get user by ID |
| GET | `/api/users/settings` | ✓ | Get notification + privacy settings |
| PATCH | `/api/users/settings` | ✓ | Update settings |

### Listings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/listings` | — | Browse listings (filter by type, category, location, search) |
| GET | `/api/listings/:id` | — | Get listing by ID |
| GET | `/api/listings/user/:userId` | — | Get listings by user |
| POST | `/api/listings` | ✓ | Create listing |
| PUT | `/api/listings/:id` | ✓ | Update listing |
| DELETE | `/api/listings/:id` | ✓ | Delete listing |

### Conversations & Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/conversations` | ✓ | List user's conversations |
| POST | `/api/conversations` | ✓ | Get or create conversation |
| GET | `/api/conversations/:id/messages` | ✓ | Get messages in conversation |
| POST | `/api/conversations/:id/messages` | ✓ | Send message (text and/or attachment fields) |
| POST | `/api/conversations/:id/attachments` | ✓ | Upload attachment (multipart), returns URL |

### Trades

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/trades` | ✓ | List user's trades |
| GET | `/api/trades/:id` | ✓ | Get trade by ID |
| POST | `/api/trades` | ✓ | Create trade proposal |
| PATCH | `/api/trades/:id/status` | ✓ | Update trade status |

### Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reviews/user/:userId` | — | Get reviews for a user |
| POST | `/api/reviews` | ✓ | Submit review |

### Notifications (in-app)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | ✓ | List notifications |
| GET | `/api/notifications/unread-count` | ✓ | Unread count |
| PATCH | `/api/notifications/:id/read` | ✓ | Mark one as read |
| PATCH | `/api/notifications/read-all` | ✓ | Mark all as read |
| DELETE | `/api/notifications/:id` | ✓ | Delete notification |

### Push Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/push/vapid-public-key` | — | Get VAPID public key |
| POST | `/api/push/subscribe` | ✓ | Save push subscription |
| DELETE | `/api/push/unsubscribe` | ✓ | Remove push subscription |

### Favorites

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/favorites` | ✓ | List favourited listings |
| POST | `/api/favorites` | ✓ | Add favourite |
| DELETE | `/api/favorites/:listingId` | ✓ | Remove favourite |

### Images

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/images/upload` | ✓ | Upload listing images (up to 5, multipart) |

---

## Real-time Events (Socket.io)

The server emits/receives these events on authenticated socket connections:

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_conversation` | Client → Server | Join a conversation room |
| `leave_conversation` | Client → Server | Leave a conversation room |
| `new_message` | Server → Client | Broadcast new message to room |
| `typing` | Client → Server | Typing indicator |
| `typing_update` | Server → Client | Broadcast typing state |

Presence tracking (`presenceMap`) prevents push notifications from firing when the recipient is already viewing the conversation.

---

## Push Notifications

Push notifications use the [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) with VAPID keys.

**Flow:**
1. Frontend registers `/sw.js` as a service worker
2. User enables push in Settings → browser permission prompt
3. Frontend subscribes via `PushManager.subscribe()` and POSTs the subscription to `/api/push/subscribe`
4. When a message is sent, the server checks `presenceMap` — if the recipient is offline or away from the conversation, `pushService.sendPushToUser()` delivers a notification
5. Expired subscriptions (HTTP 410/404 from the push service) are automatically cleaned up from the DB

To generate VAPID keys for a new deployment:

```bash
node -e "const wp = require('web-push'); const k = wp.generateVAPIDKeys(); console.log(k);"
```

Copy the output into `.env` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

---

## Database Schema

Core tables:

| Table | Description |
|-------|-------------|
| `users` | Accounts, profiles, verification flags |
| `listings` | Offers and needs posted by users |
| `conversations` | Chat threads between two users |
| `messages` | Messages with optional attachment fields |
| `trades` | Trade proposals and status |
| `reviews` | Post-trade ratings |
| `notifications` | In-app notification records |
| `notification_settings` | Per-user push/email/SMS preferences |
| `push_subscriptions` | Web Push endpoint + VAPID keys per device |
| `interests` | Predefined interest categories |
| `user_interests` | User↔interest relationships |
| `favorites` | Saved listings |
| `user_activities` | Activity feed records |

---

## Running Tests

```bash
cd views
npm test            # run all tests once
npm run test:watch  # watch mode
```

176 tests across 15 test files covering:
- Auth flows (login, register, OAuth)
- User settings (profile, avatar upload, push notification toggle)
- Chat (message send, attachment upload, emoji picker)
- Trade and review flows
- Push notification hook (`usePushNotifications`)
- Pull-to-refresh hook

---

## Security

- **Session cookies** — `HttpOnly`, `SameSite=Strict`; `Secure` flag only when `SECURE_COOKIE=true` (actual HTTPS)
- **HSTS** — only sent when `SECURE_COOKIE=true` (avoids Safari caching HSTS over HTTP in dev)
- **Content-Type guard** — `requireJson` middleware rejects mutating requests that are not `application/json` or `multipart/form-data`
- **Helmet** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Rate limiting** — auth and OTP endpoints protected
- **bcrypt** — password hashing (salt rounds 12)
- **Parameterised queries** — no raw string interpolation into SQL
- **Input validation** — express-validator on all inputs
- **trust proxy** — set to `1`; required when deployed behind a load balancer (Render, Heroku, etc.)

### Production checklist

- [ ] Set `SECURE_COOKIE=true` and serve over HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Set strong random values for `SESSION_SECRET` and `JWT_SECRET`
- [ ] Set `CORS_ORIGIN` and `FRONTEND_URL` to your production domain
- [ ] Configure Cloudinary, email, Twilio, and VAPID keys
- [ ] Run `npm run build` to bundle the frontend

---

## Future Features

### 💰 Monetization Options (for sustainability)

- [ ] **Premium Membership** — ad-free experience, unlimited listings, priority support, and advanced analytics
- [ ] **Promoted Listings** — boost listing visibility for greater reach
- [ ] **Local Business Partnerships** — sponsored content from neighborhood shops and businesses
- [ ] **Freemium Model** — basic features free; charge for premium upgrades

### 💳 Payment & Value Exchange

- [ ] **Neara Credits** — in-app currency for easier bartering and transactions
- [ ] **Multiple Trade Options** — support for barter, cash, credits, or a combination
- [ ] **Escrow Service** — secure holding of value for high-stakes trades
- [ ] **Digital Receipts** — downloadable transaction records for completed trades
- [ ] **Tips / Donations** — allow users to support community members directly

### 🔔 Notifications & Communication

- [ ] **In-app Notification Bell** — real-time notification feed without needing push permissions
- [ ] **Email Digests** — weekly summaries of nearby listings and community activity
- [ ] **Video / Voice Chat** — built-in calling for complex skill-sharing negotiations

### 🤝 Social & Community Features

- [ ] **Events Calendar** — coordinate yard sales, swap meets, and skill-sharing workshops
- [ ] **Community Groups** — create or join groups based on shared interests (gardening, DIY, parenting, etc.)
- [ ] **User Following** — follow neighbors you trade with frequently
- [ ] **Community Feed** — local announcements, news, and success stories

### ✨ Convenience & UX

- [ ] **Scheduling System** — built-in calendar to arrange pickups, deliveries, and meetups
- [ ] **QR Code Profiles** — instantly share your profile or a listing via QR code
- [ ] **Multi-photo Upload** — allow more than one image per listing
- [ ] **Video Support** — short demo videos to showcase skills or items
- [ ] **Progressive Web App (PWA)** — installable, offline-capable app experience on mobile
- [ ] **Report & Block** — enhanced moderation tools for community safety

---

## Deployment

The backend serves the built React frontend from `views/dist/`. Build and start:

```bash
npm run build   # installs views deps + runs vite build
npm start       # node server.js  — listens on PORT (default 3000)
```

On platforms like **Render** or **Heroku**, set:
- Build command: `npm run build`
- Start command: `npm start`
- Environment variable: `SECURE_COOKIE=true` (enables HTTPS-only cookies and HSTS)

---

## Authors

👤 **Sonick Mumba**

- GitHub: [@Sonickmumba](https://github.com/Sonickmumba)
- LinkedIn: [sonickmumba](https://www.linkedin.com/in/sonickmumba)

---

## License

MIT — see [MIT.md](MIT.md).
