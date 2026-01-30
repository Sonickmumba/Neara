const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const pool = require('./database');

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
          'SELECT id, name, email, password_hash FROM users WHERE email = $1',
          [email]
        );

        if (result.rowCount === 0) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const user = result.rows[0];

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        return done(null, {
          id: user.id,
          name: user.name,
          email: user.email,
        });
      } catch (err) {
        return done(err);
      }
    }
  )
);

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
      'SELECT id, name, email, location_lat, location_lng, neighborhood FROM users WHERE id = $1',
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
