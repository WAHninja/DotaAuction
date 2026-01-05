// app/api/game/[id]/publish-event/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ablyServerClient from '@/lib/ably-server';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const matchId = Number(url.pathname.split('/')[3]);
    if (isNaN(matchId)) {
      return NextResponse.json({ message: 'Invalid match ID' }, { status: 400 });
    }

    const { event, data } = await req.json();
    if (!event) {
      return NextResponse.json({ message: 'Event is required' }, { status: 400 });
    }

    const channel = ablyServerClient.channels.get(`match-${matchId}-offers`);
    await channel.publish(event, data);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error publishing event:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
