require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pg = require('pg');
const { Pool } = require('pg');


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const schemaPath = path.resolve('db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

(async () => {
  try {
    await pool.query(schema);
    console.log('✅ Database schema initialized');
    process.exit(0);
  } catch (err) {
    console.error('❌ Schema initialization failed');
    console.error(err.message);
    process.exit(1);
  }
})();
