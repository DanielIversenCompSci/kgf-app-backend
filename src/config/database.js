// db/pool.js
const path = require('path');
// ensure we load the .env in case entry file is not at project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');

// Prefer DATABASE_URL if present; otherwise use individual vars.
const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432), // <- ensure number
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      // ssl: false, // keep disabled for local Postgres on the VPS
    };

// One-time visibility to confirm env is loaded
console.log('DB config snapshot:', {
  via: process.env.DATABASE_URL ? 'DATABASE_URL' : 'DB_*',
  host: config.host || '(from URL)',
  port: config.port || '(from URL)',
  database: config.database || '(from URL)',
  user: config.user || '(from URL)',
});

const pool = new Pool(config);

// Helpful: surface idle client errors in logs
pool.on('error', (err) => {
  console.error('Unexpected pg pool error:', err);
});

module.exports = pool;
