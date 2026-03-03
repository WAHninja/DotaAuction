import { createSession } from '@/app/session';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '../../../lib/db';
import { rateLimit, getIp } from '@/lib/rate-limit';

// 10 attempts per 15 minutes per IP.
// A genuine user mistyping their PIN won't come close to this.
// An automated brute-force against a 4-digit PIN would be stopped after
// covering 0.1% of the keyspace.
const LOGIN_RATE_LIMIT = {
  id: 'login',
  limit: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export async function POST(req: NextRequest) {
  // ---- Rate limit ----------------------------------------------------------
  const ip = getIp(req);
  const result = rateLimit(ip, LOGIN_RATE_LIMIT);

  if (!result.allowed) {
    const retryAfterSecs = Math.ceil(result.retryAfterMs / 1000);
    return new Response(
      JSON.stringify({ error: 'Too many login attempts. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSecs),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // ---- Auth ----------------------------------------------------------------
  try {
    const { username, pin } = await req.json();

    // Fetch by username only — never include the PIN in the WHERE clause
    // when using hashed credentials, as timing differences can leak information.
    const dbResult = await db.query(
      'SELECT * FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    const user = dbResult.rows[0];

    // Use a constant-time comparison via bcrypt.compare.
    // Deliberately return the same generic error whether the username doesn't
    // exist or the PIN is wrong — don't tell callers which half failed.
    const pinMatches = user ? await bcrypt.compare(pin, user.pin) : false;

    if (!user || !pinMatches) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
      });
    }

    return await createSession(user.id);
  } catch (err) {
    console.error('Login error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
