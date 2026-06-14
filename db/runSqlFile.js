require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error('Usage: node db/runSqlFile.js <path-to-sql-file>');
  process.exit(1);
}

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'Neara',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 5432,
    };

const pool = new Pool(poolConfig);
const filePath = path.resolve(sqlFile);
const sql = fs.readFileSync(filePath, 'utf8');

(async () => {
  try {
    await pool.query(sql);
    console.log(`Migration applied: ${sqlFile}`);
    process.exit(0);
  } catch (err) {
    console.error(`Migration failed: ${sqlFile}`);
    console.error(err.message);
    process.exit(1);
  }
})();
