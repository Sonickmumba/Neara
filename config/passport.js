const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcrypt = require('bcrypt');
const pool = require('./database');
const { generateId } = require('../utils/helpers');

let socialAuthSchemaReadyPromise = null;

const ensureSocialAuthSchema = async () => {
  if (!socialAuthSchemaReadyPromise) {
    socialAuthSchemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS user_social_accounts (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(32) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        profile_image_url TEXT,
        profile_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_user_id),
        UNIQUE(user_id, provider)
      );

      CREATE INDEX IF NOT EXISTS idx_user_social_accounts_user
      ON user_social_accounts(user_id);

      CREATE INDEX IF NOT EXISTS idx_user_social_accounts_provider
      ON user_social_accounts(provider, provider_user_id);
    `);
  }

  return socialAuthSchemaReadyPromise;
};

const normalizeEmail = (value) => {
  const email = String(value || '')
    .trim()
    .toLowerCase();

  return email || null;
};

const toSessionUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  phone_verified: !!row.phone_verified,
  location_lat: row.location_lat,
  location_lng: row.location_lng,
  neighborhood: row.neighborhood,
});

const findOrCreateSocialUser = async ({
  provider,
  providerUserId,
  email,
  name,
  profileImageUrl,
  profileData,
  emailVerified = true,
}) => {
  if (!provider || !providerUserId) {
    throw new Error('Invalid social profile');
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    const error = new Error('Email is required from social provider');
    error.code = 'OAUTH_EMAIL_REQUIRED';
    throw error;
  }

  const client = await pool.connect();

  try {
    await ensureSocialAuthSchema();
    await client.query('BEGIN');

    const socialResult = await client.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.phone_verified,
        u.location_lat,
        u.location_lng,
        u.neighborhood
      FROM user_social_accounts sa
      JOIN users u ON u.id = sa.user_id
      WHERE sa.provider = $1
        AND sa.provider_user_id = $2
      LIMIT 1
      `,
      [provider, providerUserId]
    );

    if (socialResult.rowCount > 0) {
      await client.query(
        `
        UPDATE user_social_accounts
        SET email = $3,
            profile_image_url = $4,
            profile_data = $5,
            updated_at = NOW()
        WHERE provider = $1
          AND provider_user_id = $2
        `,
        [
          provider,
          providerUserId,
          normalizedEmail,
          profileImageUrl || null,
          profileData ? JSON.stringify(profileData) : null,
        ]
      );

      await client.query('COMMIT');
      return toSessionUser(socialResult.rows[0]);
    }

    const existingUserResult = await client.query(
      `
      SELECT id, name, email, email_verified, phone, phone_verified, location_lat, location_lng, neighborhood
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    let userRow = existingUserResult.rows[0] || null;

    if (!userRow) {
      const newUserId = generateId();
      const placeholderPasswordHash = await bcrypt.hash(generateId(), 10);

      const createUserResult = await client.query(
        `
        INSERT INTO users (id, name, email, password_hash, email_verified, profile_image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, email, phone, phone_verified, location_lat, location_lng, neighborhood
        `,
        [
          newUserId,
          String(name || normalizedEmail.split('@')[0] || 'User').slice(0, 255),
          normalizedEmail,
          placeholderPasswordHash,
          emailVerified,
          profileImageUrl || null,
        ]
      );

      userRow = createUserResult.rows[0];
    } else if (emailVerified && !userRow.email_verified) {
      await client.query(
        'UPDATE users SET email_verified = TRUE WHERE id = $1',
        [userRow.id]
      );
    }

    await client.query(
      `
      INSERT INTO user_social_accounts
      (id, user_id, provider, provider_user_id, email, profile_image_url, profile_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (provider, provider_user_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        email = EXCLUDED.email,
        profile_image_url = EXCLUDED.profile_image_url,
        profile_data = EXCLUDED.profile_data,
        updated_at = NOW()
      `,
      [
        generateId(),
        userRow.id,
        provider,
        providerUserId,
        normalizedEmail,
        profileImageUrl || null,
        profileData ? JSON.stringify(profileData) : null,
      ]
    );

    await client.query('COMMIT');
    return toSessionUser(userRow);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Local Strategy
 * email + password login
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const result = await pool.query(
          'SELECT id, name, email, phone, phone_verified, password_hash FROM users WHERE email = $1',
          [email]
        );

        if (result.rowCount === 0) {
          console.log('User not found for email:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        const user = result.rows[0];

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          console.log('Password invalid for email:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          phone_verified: !!user.phone_verified,
        });
      } catch (err) {
        console.error('Login error:', err);
        return done(err);
      }
    }
  )
);

const googleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClientSecret = String(
  process.env.GOOGLE_CLIENT_SECRET || ''
).trim();
const googleCallbackUrl =
  String(process.env.GOOGLE_CALLBACK_URL || '').trim() ||
  'http://localhost:3000/api/auth/google/callback';

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
        passReqToCallback: false,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateSocialUser({
            provider: 'google',
            providerUserId: profile?.id,
            email: profile?.emails?.[0]?.value,
            name: profile?.displayName,
            profileImageUrl: profile?.photos?.[0]?.value || null,
            profileData: {
              provider: 'google',
              id: profile?.id,
              emails: profile?.emails || [],
              photos: profile?.photos || [],
            },
            emailVerified: true,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

const facebookAppId = String(process.env.FACEBOOK_APP_ID || '').trim();
const facebookAppSecret = String(process.env.FACEBOOK_APP_SECRET || '').trim();
const facebookCallbackUrl =
  String(process.env.FACEBOOK_CALLBACK_URL || '').trim() ||
  'http://localhost:3000/api/auth/facebook/callback';

if (facebookAppId && facebookAppSecret) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: facebookAppId,
        clientSecret: facebookAppSecret,
        callbackURL: facebookCallbackUrl,
        profileFields: ['id', 'displayName', 'photos', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateSocialUser({
            provider: 'facebook',
            providerUserId: profile?.id,
            email: profile?.emails?.[0]?.value,
            name: profile?.displayName,
            profileImageUrl: profile?.photos?.[0]?.value || null,
            profileData: {
              provider: 'facebook',
              id: profile?.id,
              emails: profile?.emails || [],
              photos: profile?.photos || [],
            },
            emailVerified: true,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

/**
 * Serialize user ID into session
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, phone_verified, location_lat, location_lng, neighborhood FROM users WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return done(null, false);
    }

    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
