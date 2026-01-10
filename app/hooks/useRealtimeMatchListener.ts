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

    const handleMatchChange = (msg: any) => {
      console.log('📡 Ably match event received:', msg.name, msg.data);
      // Always refresh match data on match-level events
      Promise.resolve(fetchMatchData()).catch(console.error);
    };

    // Match-level events
    matchChannel.subscribe('game-created', handleMatchChange);
    matchChannel.subscribe('game-winner-selected', handleMatchChange);
    matchChannel.subscribe('game-finished', handleMatchChange);
    matchChannel.subscribe('new-game', handleMatchChange); // <-- NEW: triggers when backend creates next game

    console.log('🔔 Subscribed to match channel', { matchId });

    return () => {
      matchChannel.unsubscribe('game-created', handleMatchChange);
      matchChannel.unsubscribe('game-winner-selected', handleMatchChange);
      matchChannel.unsubscribe('game-finished', handleMatchChange);
      matchChannel.unsubscribe('new-game', handleMatchChange);
      console.log('🔔 Unsubscribed from match channel', { matchId });
    };
  }, [matchId, fetchMatchData]);

  // ---------------- Subscribe to offers channel separately ----------------
  useEffect(() => {
    if (!latestGameId || !matchId || !ablyClientRef.current) return;

    const offersChannel = ablyClientRef.current.channels.get(`match-${matchId}-offers`);
    offersChannelRef.current = offersChannel;

    const handleAuctionChange = (msg: any) => {
      console.log('📡 Ably auction event received:', msg.name, msg.data);
      // Refresh match data whenever offers update
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
