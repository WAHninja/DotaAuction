import { useEffect, useRef } from 'react';
import { getAblyClient } from '@/lib/ably-client';

type Callbacks = {
  fetchMatchData: () => Promise<void> | void;
  setNextStep?: (step: 'select-winner' | 'auction' | null) => void; // optional setter for UI step
};

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  { fetchMatchData, setNextStep }: Callbacks
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

    const handleMatchChange = (data?: any) => {
      console.log('📡 Ably event received: match change', data);
      Promise.resolve(fetchMatchData()).catch(console.error);

      // If the event tells us the next step, update UI accordingly
      if (data?.nextStep && setNextStep) {
        setNextStep(data.nextStep);
      }
    };

    matchChannel.subscribe('game-created', handleMatchChange);
    matchChannel.subscribe('game-winner-selected', handleMatchChange);
    matchChannel.subscribe('game-finished', handleMatchChange);
    matchChannel.subscribe('new-game', handleMatchChange); // <-- listen for new-game

    console.log('🔔 Subscribed to match channel', { matchId });

    return () => {
      matchChannel.unsubscribe('game-created', handleMatchChange);
      matchChannel.unsubscribe('game-winner-selected', handleMatchChange);
      matchChannel.unsubscribe('game-finished', handleMatchChange);
      matchChannel.unsubscribe('new-game', handleMatchChange);
      console.log('🔔 Unsubscribed from match channel', { matchId });
    };
  }, [matchId, fetchMatchData, setNextStep]);

  // ---------------- Subscribe to offers channel separately ----------------
  useEffect(() => {
    if (!latestGameId || !matchId || !ablyClientRef.current) return;

    const offersChannel = ablyClientRef.current.channels.get(`match-${matchId}-offers`);
    offersChannelRef.current = offersChannel;

    const handleAuctionChange = (data?: any) => {
      console.log('📡 Ably event received: auction change', data);
      Promise.resolve(fetchMatchData()).catch(console.error);

      // If a new game starts, also update next step
      if (data?.nextStep && setNextStep) {
        setNextStep(data.nextStep);
      }
    };

    offersChannel.subscribe('new-offer', handleAuctionChange);
    offersChannel.subscribe('offer-accepted', handleAuctionChange);

    console.log('🔔 Subscribed to offers channel', { matchId, latestGameId });

    return () => {
      offersChannel.unsubscribe('new-offer', handleAuctionChange);
      offersChannel.unsubscribe('offer-accepted', handleAuctionChange);
      console.log('🔔 Unsubscribed from offers channel', { matchId, latestGameId });
    };
  }, [matchId, latestGameId, fetchMatchData, setNextStep]);
}
