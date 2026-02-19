import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Render's free PostgreSQL tier allows ~25 connections total.
  // Keeping this low prevents exhaustion when multiple users are active
  // simultaneously during a match.
  max: 10,
  // Release idle connections after 30s so the pool doesn't hold slots
  // it isn't using between bursts of activity.
  idleTimeoutMillis: 30_000,
  // Fail fast if a connection can't be acquired — better to return a 500
  // than to queue requests indefinitely and time out at the HTTP layer.
  connectionTimeoutMillis: 5_000,
});

export default pool;
