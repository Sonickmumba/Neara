BEGIN;

-- =====================================================
-- ENUM TYPES (idempotent — skip if already exists)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE listing_type AS ENUM ('offer', 'need');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_category AS ENUM ('skills', 'goods', 'services');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trade_status AS ENUM ('pending', 'accepted', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('message', 'trade', 'review', 'listing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20) UNIQUE,
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    neighborhood VARCHAR(255),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    profile_image_url TEXT,
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_ratings INT DEFAULT 0,
    completed_trades INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_lat, location_lng);

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- EMAIL VERIFICATION CODES
-- =====================================================

CREATE TABLE IF NOT EXISTS email_verification_codes (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_codes(expires_at);

-- =====================================================
-- PHONE VERIFICATION CODES
-- =====================================================

CREATE TABLE IF NOT EXISTS phone_verification_codes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_user_created
ON phone_verification_codes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_verification_expires
ON phone_verification_codes(expires_at);

-- =====================================================
-- INTERESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS interests (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- USER_INTERESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_interests (
    user_id VARCHAR(36) NOT NULL,
    interest_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, interest_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (interest_id) REFERENCES interests(id) ON DELETE CASCADE
);

-- =====================================================
-- LISTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS listings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type listing_type NOT NULL,
    category listing_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status listing_status DEFAULT 'active',
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    image_urls JSON DEFAULT '[]'::json,
    responses_count INT DEFAULT 0,
    favorites_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at);

DROP TRIGGER IF EXISTS trg_listings_updated ON listings;
CREATE TRIGGER trg_listings_updated
BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- CONVERSATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    participant1_id VARCHAR(36) NOT NULL,
    participant2_id VARCHAR(36) NOT NULL,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant1_id, participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);

DROP TRIGGER IF EXISTS trg_conversations_updated ON conversations;
CREATE TRIGGER trg_conversations_updated
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- MESSAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    content TEXT,
    attachment_url TEXT,
    attachment_type VARCHAR(20),
    attachment_name TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- =====================================================
-- TRADES
-- =====================================================

CREATE TABLE IF NOT EXISTS trades (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    requester_id VARCHAR(36) NOT NULL,
    owner_id VARCHAR(36) NOT NULL,
    status trade_status DEFAULT 'pending',
    requester_offer TEXT NOT NULL,
    trade_date DATE,
    trade_time TIME,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trades_listing ON trades(listing_id);
CREATE INDEX IF NOT EXISTS idx_trades_requester ON trades(requester_id);
CREATE INDEX IF NOT EXISTS idx_trades_owner ON trades(owner_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

DROP TRIGGER IF EXISTS trg_trades_updated ON trades;
CREATE TRIGGER trg_trades_updated
BEFORE UPDATE ON trades
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(36) PRIMARY KEY,
    trade_id VARCHAR(36) NOT NULL,
    reviewer_id VARCHAR(36) NOT NULL,
    reviewee_id VARCHAR(36) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content TEXT NOT NULL,
    tags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (trade_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_trade ON reviews(trade_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reference_id VARCHAR(36),
    reference_type VARCHAR(50),
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- =====================================================
-- NOTIFICATION SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_settings (
    user_id VARCHAR(36) PRIMARY KEY,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    new_messages BOOLEAN DEFAULT TRUE,
    trade_updates BOOLEAN DEFAULT TRUE,
    review_alerts BOOLEAN DEFAULT TRUE,
    community_updates BOOLEAN DEFAULT FALSE,
    new_listings BOOLEAN DEFAULT TRUE,
    marketing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_notification_settings_updated ON notification_settings;
CREATE TRIGGER trg_notification_settings_updated
BEFORE UPDATE ON notification_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- USER PRIVACY SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id VARCHAR(36) PRIMARY KEY,
    show_email BOOLEAN DEFAULT FALSE,
    show_phone BOOLEAN DEFAULT FALSE,
    show_location BOOLEAN DEFAULT TRUE,
    public_profile BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_user_privacy_settings_updated ON user_privacy_settings;
CREATE TRIGGER trg_user_privacy_settings_updated
BEFORE UPDATE ON user_privacy_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- FAVORITES
-- =====================================================

CREATE TABLE IF NOT EXISTS favorites (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    listing_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created ON favorites(created_at);

-- =====================================================
-- USER BADGES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_badges (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    badge_id VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- =====================================================
-- DEFAULT INTEREST SEED
-- =====================================================

INSERT INTO interests (id, name, emoji) VALUES
('skills','Skills & Teaching','💡'),
('goods','Goods & Items','📦'),
('services','Services & Help','🛠️'),
('food','Food & Cooking','🍎'),
('creative','Creative & Arts','🎨'),
('sports','Sports & Fitness','⚽'),
('tech','Tech & Electronics','💻'),
('home','Home & Garden','🏡'),
('kids','Kids & Family','👶'),
('pets','Pets & Animals','🐕'),
('transport','Transportation','🚗'),
('events','Events & Community','🎉')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PUSH SUBSCRIPTIONS (Web Push / VAPID)
-- =====================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR(36) NOT NULL,
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- =====================================================
-- USER ACTIVITIES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_activities (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(36),
    reference_type VARCHAR(50),
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at);

COMMIT;
