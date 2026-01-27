const { Pool } = require('pg');
require('dotenv').config;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'localloop',
  password: process.env.DB_PASSWORD || '',
  port: 5432,
  max: 10,                  // connectionLimit equivalent
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.connect()
  .then(client => {
    console.log('✓ localloop Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('Error connecting to localloop database:', err.message);
  });


module.exports = pool;