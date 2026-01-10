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
  const matchChannelRef = useRef<ReturnType<ReturnType<typeof getAblyClient>['channels']['get']> | null>(null);
  const offersChannelRef = useRef<ReturnType<ReturnType<typeof getAblyClient>['channels']['get']> | null>(null);

  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return;

    const ablyClient = getAblyClient();
    if (!matchId || !ablyClient) return;

    console.log('🔔 Subscribing to Ably channels', { matchId, latestGameId });

    // ---------------- Channels ----------------
    const matchChannel = ablyClient.channels.get(`match-${matchId}`);
    const offersChannel = latestGameId ? ablyClient.channels.get(`match-${matchId}-offers`) : null;

    matchChannelRef.current = matchChannel;
    offersChannelRef.current = offersChannel;

    // ---------------- Handlers ----------------
    const handleMatchChange = () => {
      console.log('📡 Ably event received: match change');
      // Safely call async fetch without returning anything
      Promise.resolve(fetchMatchData()).catch(err => console.error(err));
    };

    const handleAuctionChange = () => {
      console.log('📡 Ably event received: auction change');
      Promise.resolve(fetchMatchData()).catch(err => console.error(err));
    };

    // ---------------- Subscribe ----------------
    matchChannel.subscribe('game-created', handleMatchChange);
    matchChannel.subscribe('game-winner-selected', handleMatchChange);
    matchChannel.subscribe('game-finished', handleMatchChange);

    offersChannel?.subscribe('new-offer', handleAuctionChange);
    offersChannel?.subscribe('offer-accepted', handleAuctionChange);

    // ---------------- Cleanup ----------------
    return () => {
      console.log('🔔 Unsubscribing from Ably channels', { matchId, latestGameId });
      matchChannelRef.current?.unsubscribe('game-created', handleMatchChange);
      matchChannelRef.current?.unsubscribe('game-winner-selected', handleMatchChange);
      matchChannelRef.current?.unsubscribe('game-finished', handleMatchChange);
      offersChannelRef.current?.unsubscribe('new-offer', handleAuctionChange);
      offersChannelRef.current?.unsubscribe('offer-accepted', handleAuctionChange);

      // Clear refs
      matchChannelRef.current = null;
      offersChannelRef.current = null;
    };
  }, [matchId, latestGameId, fetchMatchData]);
}
