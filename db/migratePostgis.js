require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

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

const migrationPath = path.resolve('db/migration_postgis.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

(async () => {
  try {
    await pool.query(migration);
    console.log('PostGIS migration applied');
    process.exit(0);
  } catch (err) {
    console.error('PostGIS migration failed');
    console.error(err.message);
    process.exit(1);
  }
})();
