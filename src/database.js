const { Pool } = require('pg');

// No default password: a missing secret must fail loudly at startup instead of
// silently falling back to a value that is committed to Git.
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD is not set. Copy .env.example to .env and set a password.');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'invoicer',
  user: process.env.DB_USER || 'invoicer',
  password: process.env.DB_PASSWORD,
  // Total connections = DB_POOL_MAX x number of backend replicas.
  // Postgres allows 100 by default, so 5 replicas x 10 = 50 is fine.
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

async function query(text, params) {
  return pool.query(text, params);
}

async function closeDatabase() {
  await pool.end();
}

module.exports = { pool, query, closeDatabase };
