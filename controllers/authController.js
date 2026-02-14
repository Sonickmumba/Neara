const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const pool = require('../config/database');
const { generateId } = require('../utils/helpers');

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

    if ((location_lat && !location_lng) || (!location_lat && location_lng)) {
      return res.status(400).json({
        success: false,
        message: 'Both latitude and longitude must be provided',
      });
    }

    // check if the user already exists
    const existingUsers = await pool.query(
      `SELECT 1 FROM users WHERE email = $1 OR phone = $2`,
      [email, phone]
    );

    const users = existingUsers.rows;

    if (users.length > 0) {
      return res
        .status(400)
        .send('User with this email or phone already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // create user in the database
    const userId = generateId();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, phone, neighborhood, location_lat,
  location_lng) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId,
        name,
        email,
        passwordHash,
        phone,
        neighborhood,
        location_lat ?? null,
        location_lng ?? null,
      ]
    );

    // Add user interests if provided
    if (Array.isArray(interests) && interests.length > 0) {
      try {
        const placeholders = interests.map((_, i) => `($1, $${i + 2})`).join(',');
        const values = [userId, ...interests];
        
        console.log('Inserting interests:', { userId, interests, placeholders, values });
        
        await pool.query(
          `INSERT INTO user_interests (user_id, interest_id) VALUES ${placeholders}`,
          values
        );
      } catch (interestErr) {
        console.error('Error inserting interests:', interestErr);
        throw interestErr;
      }
    }

    req.login({ id: userId, email, name }, (err) => {
      if (err) {
        return next(err);
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: userId,
          name,
          email,
        },
      });
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Error registering user.');
  }
};

exports.login = (req, res, next) => {
  res.json({
    success: true,
    message: 'Login successful',
    data: req.user,
  });
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
      `SELECT id, name, email, phone, neighborhood, location_lat, location_lng,
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

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
      const resetToken = jwt.sign(
        { userId, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // TODO: Send email with reset link
      console.log(`Password reset token for ${email}: ${resetToken}`);
    }
  } catch (error) {
    console.error('Password reset request error:', error);
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
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      decoded.userId,
    ]);

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired',
      });
    }

    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
