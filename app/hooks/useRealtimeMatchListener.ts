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
  const matchChannelRef = useRef<any>(null);
  const offersChannelRef = useRef<any>(null);

  // ---------------- Initialize Ably client once ----------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ablyClientRef.current) {
      ablyClientRef.current = getAblyClient();
      console.log('✅ Ably client initialized');
    }
  }, []);

  // ---------------- Subscribe to match channel ----------------
  useEffect(() => {
    if (!matchId || !ablyClientRef.current) return;

    const matchChannel = ablyClientRef.current.channels.get(`match-${matchId}`);
    matchChannelRef.current = matchChannel;

    const handleMatchChange = () => {
      console.log('📡 Ably event received: match change');
      Promise.resolve(fetchMatchData()).catch(console.error);
    };

    matchChannel.subscribe('game-created', handleMatchChange);
    matchChannel.subscribe('game-winner-selected', handleMatchChange);
    matchChannel.subscribe('game-finished', handleMatchChange);

    console.log('🔔 Subscribed to match channel', { matchId });

    return () => {
      matchChannel.unsubscribe('game-created', handleMatchChange);
      matchChannel.unsubscribe('game-winner-selected', handleMatchChange);
      matchChannel.unsubscribe('game-finished', handleMatchChange);
      console.log('🔔 Unsubscribed from match channel', { matchId });
    };
  }, [matchId, fetchMatchData]);

  // ---------------- Subscribe to offers channel separately ----------------
  useEffect(() => {
    if (!latestGameId || !matchId || !ablyClientRef.current) return;

    const offersChannel = ablyClientRef.current.channels.get(`match-${matchId}-offers`);
    offersChannelRef.current = offersChannel;

    const handleAuctionChange = () => {
      console.log('📡 Ably event received: auction change');
      Promise.resolve(fetchMatchData()).catch(console.error);
    };

    offersChannel.subscribe('new-offer', handleAuctionChange);
    offersChannel.subscribe('offer-accepted', handleAuctionChange);

    console.log('🔔 Subscribed to offers channel', { matchId, latestGameId });

    return () => {
      offersChannel.unsubscribe('new-offer', handleAuctionChange);
      offersChannel.unsubscribe('offer-accepted', handleAuctionChange);
      console.log('🔔 Unsubscribed from offers channel', { matchId, latestGameId });
    };
  }, [matchId, latestGameId, fetchMatchData]);
}
