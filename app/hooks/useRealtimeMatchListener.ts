import { useEffect, useRef } from 'react';
import { getAblyClient } from '@/lib/ably-client';

type Callbacks = {
  fetchMatchData: () => Promise<void> | void;
};

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  { fetchMatchData }: Callbacks
) {
  const ablyClientRef = useRef<ReturnType<typeof getAblyClient> | null>(null);

  // ---------------- Initialize Ably client once ----------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ablyClientRef.current) {
      ablyClientRef.current = getAblyClient();
      console.log('✅ Ably client initialized');
    }
  }, []);

  // ---------------- Match-level events ----------------
  useEffect(() => {
    if (!matchId || !ablyClientRef.current) return;

    const channel = ablyClientRef.current.channels.get(`match-${matchId}`);

    const refresh = (data?: any) => {
      console.log('📡 Match event → refetching', data);
      Promise.resolve(fetchMatchData()).catch(console.error);
    };

    channel.subscribe('game-created', refresh);
    channel.subscribe('game-winner-selected', refresh);
    channel.subscribe('game-finished', refresh);
    channel.subscribe('new-game', refresh);

    return () => {
      channel.unsubscribe();
    };
  }, [matchId, fetchMatchData]);

  // ---------------- Auction events ----------------
  useEffect(() => {
    if (!latestGameId || !matchId || !ablyClientRef.current) return;

    const channel = ablyClientRef.current.channels.get(
      `match-${matchId}-offers`
    );

    const refresh = (data?: any) => {
      console.log('📡 Auction event → refetching', data);
      Promise.resolve(fetchMatchData()).catch(console.error);
    };

    channel.subscribe('new-offer', refresh);
    channel.subscribe('offer-accepted', refresh);

    return () => {
      channel.unsubscribe();
    };
  }, [matchId, latestGameId, fetchMatchData]);
}
