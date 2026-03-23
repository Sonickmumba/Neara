const { Pool } = require('pg');

// DATABASE_URL takes priority (Render, Heroku, any 12-factor host).
// Fall back to individual vars for local development.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'Neara',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 5432,
    };

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connection
pool.connect()
  .then(client => {
    console.log('✓ Neara Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('Error connecting to Neara database:', err.message);
  });


module.exports = pool;