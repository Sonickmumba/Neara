<a name="readme-top"></a>

# 📗 Table of Contents

- [📖 About the Project](#about-project)
  - [🛠 Built With](#built-with)
    - [Tech Stack](#tech-stack)
    - [Key Features](#key-features)
  - [🚀 Live Demo](#live-demo)
- [💻 Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Install](#install)
  - [Usage](#usage)
  - [Run Tests](#run-tests)
  - [Deployment](#deployment)
- [👥 Authors](#authors)
- [🔭 Future Features](#future-features)
- [🤝 Contributing](#contributing)
- [⭐️ Show your support](#support)
- [🙏 Acknowledgements](#acknowledgements)
- [📝 License](#license)

---

# 📖 Neara <a name="about-project"></a>

**Neara** is a full-stack neighborhood community platform where people can share skills, exchange goods, negotiate trades, and communicate in real time. The `views/` directory contains the React frontend built with Vite.

## 🛠 Built With <a name="built-with"></a>

### Tech Stack <a name="tech-stack"></a>

<details>
  <summary>Client</summary>
  <ul>
    <li><a href="https://reactjs.org/">React 19</a></li>
    <li><a href="https://vitejs.dev/">Vite</a></li>
    <li><a href="https://reactrouter.com/">React Router 7</a></li>
    <li><a href="https://redux-toolkit.js.org/">Redux Toolkit</a></li>
    <li><a href="https://tailwindcss.com/">Tailwind CSS</a></li>
    <li><a href="https://axios-http.com/">Axios</a></li>
    <li><a href="https://socket.io/">Socket.io-client</a></li>
  </ul>
</details>

<details>
  <summary>Server</summary>
  <ul>
    <li><a href="https://expressjs.com/">Express.js 5</a></li>
    <li><a href="https://socket.io/">Socket.io</a></li>
    <li><a href="https://www.passportjs.org/">Passport.js</a> (Local, Google, Facebook OAuth)</li>
  </ul>
</details>

<details>
  <summary>Database</summary>
  <ul>
    <li><a href="https://www.postgresql.org/">PostgreSQL</a></li>
  </ul>
</details>

<details>
  <summary>Testing</summary>
  <ul>
    <li><a href="https://vitest.dev/">Vitest</a></li>
    <li><a href="https://testing-library.com/docs/react-testing-library/intro/">React Testing Library</a></li>
  </ul>
</details>

---

### Key Features <a name="key-features"></a>

- **Authentication** — local sign-up/login, Google and Facebook OAuth, email verification, password reset, SMS phone verification
- **Listings** — create, browse, search, and filter offers and needs by category, location, and keyword
- **Real-time Chat** — conversations with typing indicators, presence tracking, image/document attachments, and emoji picker
- **Push Notifications** — browser push notifications via Web Push API; delivered only when the recipient is away from the conversation
- **Trade System** — propose, negotiate, accept, and complete trades linked to listings
- **Reviews & Ratings** — rate trading partners after a completed trade
- **Favorites** — save listings for later
- **Avatar Upload** — profile photo upload with Cloudinary CDN storage
- **Location-based Search** — find listings nearby using geolocation
- **Settings** — notification preferences and privacy controls

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🚀 Live Demo <a name="live-demo"></a>

> Coming soon.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 💻 Getting Started <a name="getting-started"></a>

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Setup

Clone the repository:

```sh
git clone https://github.com/Sonickmumba/Neara.git
cd Neara
```

### Install

Install backend dependencies:

```sh
npm install
```

Install frontend dependencies:

```sh
cd views && npm install && cd ..
```

Create and configure your environment file at the project root:

```sh
cp .env.example .env
# Fill in your DB credentials, OAuth keys, Cloudinary, VAPID keys, etc.
```

Initialise the database:

```sh
psql -U postgres -c "CREATE DATABASE Neara;"
psql -U postgres -d Neara -f db/schema.sql
```

### Usage

**Development** (two terminals):

```sh
# Terminal 1 — backend API on :3000
npm run dev

# Terminal 2 — frontend dev server with HMR on :5173
cd views && npm run dev
```

**Production build** (frontend served by Express on :3000):

```sh
npm run build   # builds the React app into views/dist/
npm start       # starts Express — visit http://localhost:3000
```

### Run Tests

```sh
cd views
npm test              # run all tests once
npm run test:watch    # watch mode
```

176 tests across 15 test files covering:

- Authentication flows (register, login, OAuth)
- User settings — profile edits, avatar upload, push notification toggle
- Chat — send messages, file attachments, emoji picker
- Trade and review flows
- `usePushNotifications` hook — service worker registration, subscribe, unsubscribe
- `usePullToRefresh` hook

### Deployment

The backend serves the built React app from `views/dist/`:

```sh
npm run build   # installs frontend deps + runs vite build
npm start       # node server.js — listens on PORT (default 3000)
```

On platforms like **Render** or **Heroku**, set:

- Build command: `npm run build`
- Start command: `npm start`
- Environment variable: `SECURE_COOKIE=true` (enables HTTPS-only cookies and HSTS)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 👥 Authors <a name="authors"></a>

👤 **Sonick Mumba**

- GitHub: [@Sonickmumba](https://github.com/Sonickmumba)
- LinkedIn: [sonickmumba](https://www.linkedin.com/in/sonickmumba)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🔭 Future Features <a name="future-features"></a>

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

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🤝 Contributing <a name="contributing"></a>

Contributions, issues, and feature requests are welcome!

Feel free to check the [issues page](../../issues/).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## ⭐️ Show your support <a name="support"></a>

If you find this project useful, give it a star on GitHub — it helps others discover it.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🙏 Acknowledgements <a name="acknowledgements"></a>

- [Microverse](https://www.microverse.org/) — README template structure
- [Lucide Icons](https://lucide.dev/) — icon library used throughout the UI
- [Sonner](https://sonner.emilkowal.ski/) — toast notifications
- [emoji-picker-react](https://github.com/ealush/emoji-picker-react) — emoji picker component
- [web-push](https://github.com/web-push-libs/web-push) — Web Push / VAPID library

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 📝 License <a name="license"></a>

This project is [MIT](../MIT.md) licensed.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
