import { useEffect, useRef } from 'react';
import { getAblyClient } from '@/lib/ably-client';

type Callbacks = {
  fetchMatchData: () => Promise<void> | void;
  setData?: React.Dispatch<React.SetStateAction<any>>; // optional, fine-grained updates
};

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  { fetchMatchData, setData }: Callbacks
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

    const onGameUpdated = (data?: any) => {
      console.log('📡 game-updated event', data);
      fetchMatchData();
    };

    channel.subscribe('game-updated', onGameUpdated);

    return () => channel.unsubscribe('game-updated', onGameUpdated);
  }, [matchId, fetchMatchData]);

  // ---------------- Auction-level events ----------------
  useEffect(() => {
    if (!latestGameId || !matchId || !ablyClientRef.current) return;
    const channel = ablyClientRef.current.channels.get(`match-${matchId}-offers`);

    const onNewOffer = (data?: any) => {
      console.log('📡 new-offer event', data);

      if (data?.offer && setData) {
        setData((prev: any) => {
          if (!prev) return prev;
          const updatedOffers = [...(prev.latestGame?.offers || []), data.offer];
          return {
            ...prev,
            latestGame: {
              ...prev.latestGame,
              offers: updatedOffers,
            },
          };
        });
      } else {
        fetchMatchData();
      }
    };

    channel.subscribe('new-offer', onNewOffer);

    return () => channel.unsubscribe('new-offer', onNewOffer);
  }, [matchId, latestGameId, fetchMatchData, setData]);
}
