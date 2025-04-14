import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function POST(req: Request) {
  try {
    const { username, pin } = await req.json();
    if (!username || !pin || pin.length < 4) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const query = 'INSERT INTO users (username, pin, created_at) VALUES ($1, $2, NOW()) RETURNING id';
    const result = await db.query(query, [username, pin]);
    return NextResponse.json({ message: 'User registered successfully!', userId: result.rows[0].id });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
