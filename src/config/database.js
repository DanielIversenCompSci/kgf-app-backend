// require dotenv
// secrets out of code
require('dotenv').config();
const { Pool } = require('pg');

// connection pool to PostgreSQL db
// using pool to manage multiple connections
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

module.exports = pool;