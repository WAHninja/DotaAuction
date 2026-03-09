// app/whiteboard/page.tsx

import { getSession } from '@/app/session';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import WhiteboardClient from './WhiteboardClient';

export default async function WhiteboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const { rows } = await db.query<{ username: string }>(
    'SELECT username FROM users WHERE id = $1',
    [session.userId]
  );
  const username = rows[0]?.username ?? `Player#${session.userId}`;

  return (
    <WhiteboardClient
      roomId="dota-auctions-main"
      username={username}
      userId={session.userId}
    />
  );
}
