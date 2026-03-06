import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '../../../lib/db';
import { rateLimit, getIp } from '@/lib/rate-limit';

// 5 registrations per hour per IP — generous enough for a friend setting up
// their account, tight enough to prevent mass account creation.
const REGISTER_RATE_LIMIT = {
  id: 'register',
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

export async function POST(req: Request) {
  // ---- Rate limit ----------------------------------------------------------
  const ip = getIp(req);
  const result = rateLimit(ip, REGISTER_RATE_LIMIT);

  if (!result.allowed) {
    const retryAfterSecs = Math.ceil(result.retryAfterMs / 1000);
    return new Response(
      JSON.stringify({ error: 'Too many registration attempts. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSecs),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // ---- Register ------------------------------------------------------------
  try {
    const { username, pin } = await req.json();

    // Validate PIN — same rule as /api/me/pin
    if (!pin || !/^\d{4,}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be at least 4 digits.' },
        { status: 400 }
      );
    }

    // Validate username — same rule as /api/me/username (2–32 characters)
    const cleanedUsername = username?.trim();
    if (!cleanedUsername || cleanedUsername.length < 2 || cleanedUsername.length > 32) {
      return NextResponse.json(
        { error: 'Username must be between 2 and 32 characters.' },
        { status: 400 }
      );
    }

    const hashedPin = await bcrypt.hash(pin, 12);

    const query = 'INSERT INTO users (username, pin, created_at) VALUES ($1, $2, NOW()) RETURNING id';
    const dbResult = await db.query(query, [cleanedUsername, hashedPin]);
    return NextResponse.json({ message: 'User registered successfully!', userId: dbResult.rows[0].id });
  } catch (error: any) {
    // Catch unique constraint violation on username (Postgres error code 23505)
    if (error.code === '23505' && error.constraint === 'users_username_key') {
      return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
    }
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
