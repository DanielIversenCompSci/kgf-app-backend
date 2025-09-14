// src/db/pool.js (adjust the path if your file lives elsewhere)
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// ABSOLUTE path is the safest under PM2
const ENV_PATH = '/var/www/kgfapi/.env';

console.log('Loading .env from:', ENV_PATH, 'exists?', fs.existsSync(ENV_PATH));

require('dotenv').config({
  path: ENV_PATH,
  override: true,
  // quiet: true, // optional
});

// Prefer DATABASE_URL if present; otherwise DB_*
const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

console.log('DB config snapshot:', {
  via: process.env.DATABASE_URL ? 'DATABASE_URL' : 'DB_*',
  host: config.host || '(from URL)',
  port: config.port || '(from URL)',
  database: config.database || '(from URL)',
  user: config.user || '(from URL)',
});

const pool = new Pool(config);
pool.on('error', (err) => console.error('Unexpected pg pool error:', err));

module.exports = pool;
