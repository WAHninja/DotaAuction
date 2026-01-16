import { useEffect } from 'react';
import { getAblyClient } from '@/lib/ably-client';

type Callbacks = {
  fetchMatchData: () => Promise<void> | void;
};

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  { fetchMatchData }: Callbacks
) {
  // ---------------- Match lifecycle ----------------
  useEffect(() => {
    if (!matchId) return;

    const client = getAblyClient();
    const channel = client.channels.get(`match-${matchId}`);

    const handler = () => {
      console.log('📡 match event');
      fetchMatchData();
    };

    channel.subscribe('game-created', handler);
    channel.subscribe('game-updated', handler);
    channel.subscribe('game-winner-selected', handler);

    return () => {
      channel.unsubscribe('game-created', handler);
      channel.unsubscribe('game-updated', handler);
      channel.unsubscribe('game-winner-selected', handler);
    };
  }, [matchId, fetchMatchData]);

  // ---------------- Offers / auction ----------------
  useEffect(() => {
    if (!matchId || !latestGameId) return;

    const client = getAblyClient();
    const channel = client.channels.get(`match-${matchId}-offers`);

    const handler = () => {
      console.log('📡 offer event');
      fetchMatchData();
    };

    channel.subscribe('new-offer', handler);
    channel.subscribe('offer-accepted', handler);

    return () => {
      channel.unsubscribe('new-offer', handler);
      channel.unsubscribe('offer-accepted', handler);
    };
  }, [matchId, latestGameId, fetchMatchData]);
}
