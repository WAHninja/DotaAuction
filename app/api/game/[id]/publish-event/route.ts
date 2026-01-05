// app/api/game/[id]/publish-event/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { publishMatchEvent } from '@/lib/ably';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const matchId = Number(url.pathname.split('/')[3]); // /api/game/{id}/publish-event
    if (isNaN(matchId)) {
      return NextResponse.json({ message: 'Invalid match ID' }, { status: 400 });
    }

    const { event, data } = await req.json();
    if (!event) {
      return NextResponse.json({ message: 'Event is required' }, { status: 400 });
    }

    // Use the build-safe Ably helper
    await publishMatchEvent(matchId, event, data);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error publishing event:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
