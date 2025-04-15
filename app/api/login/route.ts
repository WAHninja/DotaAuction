import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return NextResponse.json({ error: 'Username and PIN required' }, { status: 400 });
    }

    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 AND pin = $2',
      [username, pin]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({ success: true, userId: result.rows[0].id });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
