// app/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/session';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  const sessionId = getSession();
  if (sessionId) {
    await db.session.delete({ where: { id: sessionId } });
  }

  destroySession();

  return NextResponse.redirect(new URL('/', req.url));
}
