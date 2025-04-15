// app/api/login/route.ts
import { createSession } from '../../../lib/session';
import { NextRequest } from 'next/server';
import db from '../../../lib/db';

export async function POST(req: NextRequest) {
  const { username, pin } = await req.json();

  const user = await db.user.findFirst({
    where: { username, pin },
  });

  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
    });
  }

  return await createSession(user.id);
}
