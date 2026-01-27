const { Pool } = require('pg');
require('dotenv').config;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Neara',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
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