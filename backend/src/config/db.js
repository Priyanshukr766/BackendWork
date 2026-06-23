/**
 * db.js — PostgreSQL Connection Pool
 *
 * Purpose:
 *   Creates a single shared pg.Pool instance used throughout the application.
 *   All database queries go through this pool — never creating raw one-off connections.
 *
 * Why a Pool?
 *   A connection pool reuses a fixed set of database connections instead of
 *   opening and closing a new connection for every query.
 *   This is far more efficient under concurrent traffic.
 *
 * Configuration:
 *   - connectionString : read from DATABASE_URL in .env (Supabase connection URI)
 *   - ssl.rejectUnauthorized: false : required for Supabase and most hosted PostgreSQL providers
 *
 * Startup check:
 *   On import, attempts a test connection and logs success or failure.
 *   This gives immediate feedback if the DATABASE_URL is wrong or the DB is unreachable.
 *
 * Exports:
 *   pool — the shared pg.Pool instance, imported by the repository layer
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase / hosted PostgreSQL
  },
});

// Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Database connected successfully');
    release();
  }
});

export default pool;
