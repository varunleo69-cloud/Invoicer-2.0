const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'invoicer',
  user: process.env.DB_USER || 'invoicer',
  password: process.env.DB_PASSWORD || 'invoicer_dev_password',
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
