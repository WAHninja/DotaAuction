import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '../../../lib/session';
import db from '../../../lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { username, pin } = await req.json();

  const user = await db.user.findFirst({ where: { username } });
  if (!user || !(await bcrypt.compare(pin, user.pin))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const { sessionId } = createSession(user.id);

  await db.session.create({
    data: {
      id: sessionId,
      user_id: user.id,
    },
  });

  return NextResponse.json({ message: 'Logged in' });
}
