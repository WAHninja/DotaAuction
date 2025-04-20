// app/api/login/route.ts
import { createSession } from '@/app/session';
import { NextRequest } from 'next/server';
import db from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();

    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 AND pin = $2 LIMIT 1',
      [username, pin]
    );

    const user = result.rows[0];

    if (!user) {
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
