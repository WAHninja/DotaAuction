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

    const onGameCreated = async (data?: any) => {
      console.log('📡 game-created event → refetching', data);
      await fetchMatchData();
    };

    const onGameWinnerSelected = async (data?: any) => {
      console.log('📡 game-winner-selected event → refetching', data);
      await fetchMatchData();
    };

    const onGameFinished = async (data?: any) => {
      console.log('📡 game-finished event → refetching', data);
      await fetchMatchData();
    };

    const onNewGame = async (data?: any) => {
      console.log('📡 new-game event → refetching', data);
      await fetchMatchData();
    };

    // Subscribe
    channel.subscribe('game-created', onGameCreated);
    channel.subscribe('game-winner-selected', onGameWinnerSelected);
    channel.subscribe('game-finished', onGameFinished);
    channel.subscribe('new-game', onNewGame);

    // Cleanup: unsubscribe specific events
    return () => {
      channel.unsubscribe('game-created', onGameCreated);
      channel.unsubscribe('game-winner-selected', onGameWinnerSelected);
      channel.unsubscribe('game-finished', onGameFinished);
      channel.unsubscribe('new-game', onNewGame);
    };
  }, [matchId, fetchMatchData]);

  // ---------------- Auction events ----------------
  useEffect(() => {
    if (!latestGameId || !matchId || !ablyClientRef.current) return;

    const channel = ablyClientRef.current.channels.get(
      `match-${matchId}-offers`
    );

    const onNewOffer = async (data?: any) => {
      console.log('📡 new-offer event → refetching', data);
      await fetchMatchData();
    };

    const onOfferAccepted = async (data?: any) => {
      console.log('📡 offer-accepted event → refetching', data);
      await fetchMatchData();
    };

    channel.subscribe('new-offer', onNewOffer);
    channel.subscribe('offer-accepted', onOfferAccepted);

    // Cleanup: unsubscribe specific events
    return () => {
      channel.unsubscribe('new-offer', onNewOffer);
      channel.unsubscribe('offer-accepted', onOfferAccepted);
    };
  }, [matchId, latestGameId, fetchMatchData]);
}
