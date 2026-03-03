import { createSession } from '@/app/session';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();

    // Fetch by username only — never include the PIN in the WHERE clause
    // when using hashed credentials, as timing differences can leak information.
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    const user = result.rows[0];

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
