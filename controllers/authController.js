const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const pool = require('../config/database');
const { generateId } = require('../utils/helpers');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../utils/emailService');
const { sendVerificationSms } = require('../utils/smsService');

let phoneVerificationSchemaReadyPromise = null;
let emailVerificationSchemaReadyPromise = null;
let passwordResetSchemaReadyPromise = null;

const normalizeEmail = (value) => {
  const email = String(value || '')
    .trim()
    .toLowerCase();

  return email || null;
};

const hashOtpCode = (code) => {
  const secret = process.env.OTP_SECRET || process.env.SESSION_SECRET || 'otp';
  return crypto.createHash('sha256').update(`${code}:${secret}`).digest('hex');
};

const hashToken = (token) => {
  const secret =
    process.env.PASSWORD_RESET_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    'reset';
  return crypto
    .createHash('sha256')
    .update(`${token}:${secret}`)
    .digest('hex');
};

const ensureEmailVerificationSchema = async () => {
  if (!emailVerificationSchemaReadyPromise) {
    emailVerificationSchemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6),
        code_hash VARCHAR(128),
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        expires_at TIMESTAMP NOT NULL,
        verified_at TIMESTAMP,
        consumed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE email_verification_codes
      ADD COLUMN IF NOT EXISTS code_hash VARCHAR(128);

      ALTER TABLE email_verification_codes
      ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;

      ALTER TABLE email_verification_codes
      ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 5;

      ALTER TABLE email_verification_codes
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

      ALTER TABLE email_verification_codes
      ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMP;

      ALTER TABLE email_verification_codes
      ALTER COLUMN code DROP NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_email_verification_email
      ON email_verification_codes(email);

      CREATE INDEX IF NOT EXISTS idx_email_verification_expires
      ON email_verification_codes(expires_at);
    `);
  }

  return emailVerificationSchemaReadyPromise;
};

const ensurePasswordResetSchema = async () => {
  if (!passwordResetSchemaReadyPromise) {
    passwordResetSchemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_password_reset_user_created
      ON password_reset_tokens(user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_password_reset_expires
      ON password_reset_tokens(expires_at);
    `);
  }

  return passwordResetSchemaReadyPromise;
};

const normalizePhone = (input) => {
  const digits = String(input || '').replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('260')) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith('0'))
    return `+260${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('9')) return `+260${digits}`;

  return null;
};

const ensurePhoneVerificationSchema = async () => {
  if (!phoneVerificationSchemaReadyPromise) {
    phoneVerificationSchemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS phone_verification_codes (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phone VARCHAR(20) NOT NULL,
        code_hash VARCHAR(128) NOT NULL,
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_phone_verification_user_created
      ON phone_verification_codes(user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_phone_verification_expires
      ON phone_verification_codes(expires_at);
    `);
  }

  return phoneVerificationSchemaReadyPromise;
};

// register user
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('VALIDATION ERRORS:', errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      email,
      password,
      phone,
      neighborhood,
      interests,
      location_lat,
      location_lng,
    } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'A valid email is required',
      });
    }

    const hasLocationLat =
      location_lat !== undefined && location_lat !== null && location_lat !== '';
    const hasLocationLng =
      location_lng !== undefined && location_lng !== null && location_lng !== '';

    if (hasLocationLat !== hasLocationLng) {
      return res.status(400).json({
        success: false,
        message: 'Both latitude and longitude must be provided',
      });
    }

    await ensureEmailVerificationSchema();

    const client = await pool.connect();
    let userId;

    try {
      await client.query('BEGIN');

      const verifiedEmailResult = await client.query(
        `
        SELECT id
        FROM email_verification_codes
        WHERE email = $1
          AND verified_at IS NOT NULL
          AND consumed_at IS NULL
          AND expires_at > NOW()
        ORDER BY verified_at DESC
        LIMIT 1
        FOR UPDATE
        `,
        [normalizedEmail]
      );

      if (verifiedEmailResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Please verify your email before creating an account',
        });
      }

      // check if the user already exists
      const existingUsers = await client.query(
        `SELECT 1 FROM users WHERE email = $1 OR phone = $2`,
        [normalizedEmail, phone]
      );

      const users = existingUsers.rows;

      if (users.length > 0) {
        await client.query('ROLLBACK');
        return res
          .status(400)
          .send('User with this email or phone already exists');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // create user in the database
      userId = generateId();
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, phone, neighborhood, location_lat,
    location_lng, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          userId,
          name,
          normalizedEmail,
          passwordHash,
          phone,
          neighborhood,
          location_lat ?? null,
          location_lng ?? null,
          true,
        ]
      );

      // Add user interests if provided
      if (Array.isArray(interests) && interests.length > 0) {
        const placeholders = interests
          .map((_, i) => `($1, $${i + 2})`)
          .join(',');
        const values = [userId, ...interests];

        await client.query(
          `INSERT INTO user_interests (user_id, interest_id) VALUES ${placeholders}`,
          values
        );
      }

      await client.query(
        `
        UPDATE email_verification_codes
        SET consumed_at = NOW()
        WHERE id = $1
        `,
        [verifiedEmailResult.rows[0].id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Auto-login user after registration (email already verified)
    req.login(
      { id: userId, email: normalizedEmail, name, phone, phone_verified: false },
      (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({
            success: false,
            message: 'Account created but login failed',
          });
        }

        // Ensure session is saved before sending response
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({
              success: false,
              message: 'Failed to create session',
            });
          }

          res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
              user: {
                id: userId,
                name,
                email: normalizedEmail,
                phone,
                phone_verified: false,
              },
            },
          });
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send('Error registering user.');
  }
};

exports.login = (req, res, next) => {
  res.json({
    success: true,
    message: 'Login successful',
    data: { user: req.user },
  });
};

exports.sendPhoneVerificationCode = async (req, res) => {
  try {
    const userId = req.user?.id;
    const normalizedPhone = normalizePhone(req.body?.phone);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number',
      });
    }

    await ensurePhoneVerificationSchema();

    const recentCountResult = await pool.query(
      `
      SELECT COUNT(*)::int AS sent_count
      FROM phone_verification_codes
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '15 minutes'
      `,
      [userId]
    );

    if ((recentCountResult.rows[0]?.sent_count || 0) >= 6) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please try again later.',
      });
    }

    const cooldownResult = await pool.query(
      `
      SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::int AS elapsed_seconds
      FROM phone_verification_codes
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    );

    const elapsed = cooldownResult.rows[0]?.elapsed_seconds;
    if (elapsed !== undefined && elapsed !== null && elapsed < 60) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another code',
        retryAfter: 60 - elapsed,
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO phone_verification_codes
      (id, user_id, phone, code_hash, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [generateId(), userId, normalizedPhone, codeHash, expiresAt]
    );

    const smsResult = await sendVerificationSms(normalizedPhone, code);

    if (!smsResult.ok && smsResult.configured) {
      await pool.query(
        `
        DELETE FROM phone_verification_codes
        WHERE user_id = $1 AND phone = $2 AND code_hash = $3 AND consumed_at IS NULL
        `,
        [userId, normalizedPhone, codeHash]
      );

      return res.status(502).json({
        success: false,
        message: 'Failed to deliver verification SMS. Please try again.',
      });
    }

    const payload = {
      success: true,
      message: 'Verification code sent',
      expiresIn: 600,
      retryAfter: 60,
    };

    if (!smsResult.configured && process.env.NODE_ENV !== 'production') {
      payload.devCode = code;
    }

    res.json(payload);
  } catch (error) {
    console.error('Send phone verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code',
    });
  }
};

exports.verifyPhoneCode = async (req, res) => {
  try {
    const userId = req.user?.id;
    const normalizedPhone = normalizePhone(req.body?.phone);
    const code = String(req.body?.code || '').trim();

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!normalizedPhone || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Phone and 6-digit code are required',
      });
    }

    await ensurePhoneVerificationSchema();

    const verificationResult = await pool.query(
      `
      SELECT id, code_hash, attempts, max_attempts, expires_at
      FROM phone_verification_codes
      WHERE user_id = $1
        AND phone = $2
        AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId, normalizedPhone]
    );

    if (!verificationResult.rows.length) {
      return res.status(400).json({
        success: false,
        message:
          'No active verification code found. Please request a new code.',
      });
    }

    const record = verificationResult.rows[0];

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    if ((record.attempts || 0) >= (record.max_attempts || 5)) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Request a new code.',
      });
    }

    const isMatch = hashOtpCode(code) === record.code_hash;

    if (!isMatch) {
      const updatedAttempts = (record.attempts || 0) + 1;
      await pool.query(
        'UPDATE phone_verification_codes SET attempts = $2 WHERE id = $1',
        [record.id, updatedAttempts]
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
        remainingAttempts: Math.max(
          (record.max_attempts || 5) - updatedAttempts,
          0
        ),
      });
    }

    const updatedUserResult = await pool.query(
      `
      UPDATE users
      SET phone = $2, phone_verified = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, phone, phone_verified
      `,
      [userId, normalizedPhone]
    );

    await pool.query(
      'UPDATE phone_verification_codes SET consumed_at = NOW() WHERE id = $1',
      [record.id]
    );

    res.json({
      success: true,
      message: 'Phone verified successfully',
      data: {
        user: updatedUserResult.rows[0],
      },
    });
  } catch (error) {
    console.error('Verify phone code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code',
    });
  }
};

// Send verification email
exports.sendVerificationEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    await ensureEmailVerificationSchema();

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = hashOtpCode(code);

    // Set expiration to 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old codes for this email
    await pool.query(
      'DELETE FROM email_verification_codes WHERE email = $1 AND consumed_at IS NULL',
      [email]
    );

    // Store new verification code
    const codeId = generateId();
    await pool.query(
      `
      INSERT INTO email_verification_codes
      (id, email, code_hash, expires_at)
      VALUES ($1, $2, $3, $4)
      `,
      [codeId, email, codeHash, expiresAt]
    );

    // Send verification email
    const emailSent = await sendVerificationEmail(email, code);

    if (!emailSent) {
      await pool.query('DELETE FROM email_verification_codes WHERE id = $1', [
        codeId,
      ]);

      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to email',
      email,
    });
  } catch (error) {
    console.error('Send verification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
    });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code must be exactly 6 digits',
      });
    }

    await ensureEmailVerificationSchema();

    const result = await pool.query(
      `
      SELECT id, code_hash, attempts, max_attempts, expires_at, verified_at
      FROM email_verification_codes
      WHERE email = $1
        AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
      });
    }

    const record = result.rows[0];

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    if ((record.attempts || 0) >= (record.max_attempts || 5)) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Request a new code.',
      });
    }

    const isMatch = hashOtpCode(code) === record.code_hash;

    if (!isMatch) {
      const updatedAttempts = (record.attempts || 0) + 1;
      await pool.query(
        'UPDATE email_verification_codes SET attempts = $2 WHERE id = $1',
        [record.id, updatedAttempts]
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
        remainingAttempts: Math.max(
          (record.max_attempts || 5) - updatedAttempts,
          0
        ),
      });
    }

    if (!record.verified_at) {
      await pool.query(
        'UPDATE email_verification_codes SET verified_at = NOW() WHERE id = $1',
        [record.id]
      );
    }

    // Email verification successful - user will be created in register endpoint
    res.json({
      success: true,
      message: 'Email verified successfully',
      email,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res, next) => {
  try {
    let userId = req.params.id;

    // Handle /user/me
    if (userId === 'me') {
      userId = req.user.id;
    }

    // Fetch user
    const userResult = await pool.query(
      `SELECT id, name, email, phone, neighborhood, location_lat, location_lng,
              profile_image_url, rating, total_ratings, completed_trades, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Fetch user interests
    const interestsResult = await pool.query(
      `SELECT i.id, i.name, i.emoji
       FROM interests i
       JOIN user_interests ui ON i.id = ui.interest_id
       WHERE ui.user_id = $1`,
      [userId]
    );

    user.interests = interestsResult.rows;

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    // Fetch user
    const userResult = await pool.query(
      `SELECT id, name, email, phone, phone_verified, neighborhood, location_lat, location_lng,
              profile_image_url, rating, total_ratings, completed_trades, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Fetch user interests
    const interestsResult = await pool.query(
      `SELECT i.id, i.name, i.emoji
       FROM interests i
       JOIN user_interests ui ON i.id = ui.interest_id
       WHERE ui.user_id = $1`,
      [req.user.id]
    );

    user.interests = interestsResult.rows;

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: 'Could not log out' });
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.json({ success: true, message: 'Logged out' });
  });
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    await ensurePasswordResetSchema();

    // Check if user exists
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [
      email,
    ]);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message:
        'If an account with this email exists, a reset link has been sent.',
    });

    // If user exists, generate reset token (implement email sending later)
    if (result.rowCount > 0) {
      const userId = result.rows[0].id;

      await pool.query(
        `
        UPDATE password_reset_tokens
        SET consumed_at = NOW()
        WHERE user_id = $1
          AND consumed_at IS NULL
        `,
        [userId]
      );

      const resetToken = crypto.randomBytes(32).toString('base64url');
      const tokenHash = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await pool.query(
        `
        INSERT INTO password_reset_tokens
        (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
        `,
        [generateId(), userId, tokenHash, expiresAt]
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(email, resetLink);
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    if (res.headersSent) return;
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Reset password with token
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Set new access token
    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Token refreshed',
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
};

exports.resetPassword = async (req, res) => {
  const client = await pool.connect();

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
    }

    await ensurePasswordResetSchema();

    await client.query('BEGIN');

    const tokenHash = hashToken(token);
    const tokenResult = await client.query(
      `
      SELECT id, user_id, expires_at
      FROM password_reset_tokens
      WHERE token_hash = $1
        AND consumed_at IS NULL
      LIMIT 1
      FOR UPDATE
      `,
      [tokenHash]
    );

    if (tokenResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token',
      });
    }

    const resetRecord = tokenResult.rows[0];

    if (new Date(resetRecord.expires_at).getTime() <= Date.now()) {
      await client.query(
        'UPDATE password_reset_tokens SET consumed_at = NOW() WHERE id = $1',
        [resetRecord.id]
      );
      await client.query('COMMIT');
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, resetRecord.user_id]
    );

    await client.query(
      `
      UPDATE password_reset_tokens
      SET consumed_at = NOW()
      WHERE user_id = $1
        AND consumed_at IS NULL
      `,
      [resetRecord.user_id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  } finally {
    client.release();
  }
};

// Change password (authenticated user)
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    // Fetch stored hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const storedHash = result.rows[0].password_hash;

    // Users created via social OAuth have no password
    if (!storedHash) {
      return res.status(400).json({
        success: false,
        message: 'Your account uses social sign-in and does not have a password.',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, storedHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getFrontendBaseUrl = () => {
  const candidate =
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGIN ||
    'http://localhost:5173';

  return String(candidate).replace(/\/$/, '');
};

const buildFrontendUrl = (path, params = {}) => {
  const base = getFrontendBaseUrl();
  const url = new URL(path, `${base}/`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

exports.socialAuthFailureRedirect = (req, res) => {
  const reason = req.query.reason || 'oauth_failed';
  const provider = req.query.provider || 'social';

  const redirectUrl = buildFrontendUrl('/loginSignup', {
    social: 'error',
    provider,
    reason,
  });

  return res.redirect(redirectUrl);
};

exports.socialAuthSuccessRedirect = (req, res) => {
  const user = req.user;

  if (!user?.id) {
    const redirectUrl = buildFrontendUrl('/loginSignup', {
      social: 'error',
      reason: 'session_missing',
    });
    return res.redirect(redirectUrl);
  }

  const redirectUrl = buildFrontendUrl('/homeFeed', {
    social: 'success',
    phoneVerified: user.phone_verified ? 'true' : 'false',
  });

  req.session.save((saveErr) => {
    if (saveErr) {
      const fallback = buildFrontendUrl('/loginSignup', {
        social: 'error',
        reason: 'session_save_failed',
      });
      return res.redirect(fallback);
    }

    return res.redirect(redirectUrl);
  });
};
