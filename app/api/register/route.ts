import { NextResponse } from 'next/server';
import { getDBConnection } from '@/lib/db';

export async function POST(request: Request) {
  const { username, pin } = await request.json();

  if (!username || !pin || pin.length < 4) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    const db = await getDBConnection();
    const [existing] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    await db.execute('INSERT INTO users (username, pin, created_at) VALUES (?, ?, NOW())', [username, pin]);
    return NextResponse.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}