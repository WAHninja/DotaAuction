import { useEffect, useRef } from 'react';
import { getAblyClient } from '@/lib/ably-client';

type Callbacks = {
  fetchMatchData: () => Promise<void> | void;
  setData?: React.Dispatch<React.SetStateAction<any>>; // optional
};

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  { fetchMatchData, setData }: Callbacks
) {
  const ablyRef = useRef(getAblyClient());

  // ---------------- Match lifecycle ----------------
  useEffect(() => {
    if (!matchId) return;
    const client = ablyRef.current;
    const channel = client.channels.get(`match-${matchId}`);

    const handler = (msg: any) => {
      console.log('📡 match event', msg.name, msg.data);
      fetchMatchData();

      // Optional: if server sends updated match data, merge it
      if (setData && msg.data) {
        setData((prev: any) => ({
          ...prev,
          ...msg.data,
        }));
      }
    };

    channel.subscribe('game-created', handler);
    channel.subscribe('game-updated', handler);
    channel.subscribe('game-winner-selected', handler);

    return () => {
      channel.unsubscribe('game-created', handler);
      channel.unsubscribe('game-updated', handler);
      channel.unsubscribe('game-winner-selected', handler);
    };
  }, [matchId, fetchMatchData, setData]);

  // ---------------- Offers / auction ----------------
  useEffect(() => {
    if (!matchId || !latestGameId) return;
    const client = ablyRef.current;
    const channel = client.channels.get(`match-${matchId}-offers`);

    const handler = (msg: any) => {
      console.log('📡 offer event', msg.name, msg.data);

      if (setData && msg.data) {
        // Merge or replace offers
        const newOffers = msg.data.offers ?? (msg.data.offer ? [msg.data.offer] : []);
        setData((prev: any) => {
          if (!prev?.latestGame) return prev;
          const existingOffers = prev.latestGame.offers ?? [];
          const merged = [...existingOffers];

          for (const offer of newOffers) {
            if (!merged.find((o: any) => o.id === offer.id)) merged.push(offer);
          }

          return {
            ...prev,
            latestGame: {
              ...prev.latestGame,
              offers: merged,
            },
          };
        });
      } else {
        fetchMatchData();
      }
    };

    channel.subscribe('new-offer', handler);
    channel.subscribe('offer-accepted', handler);

    return () => {
      channel.unsubscribe('new-offer', handler);
      channel.unsubscribe('offer-accepted', handler);
    };
  }, [matchId, latestGameId, fetchMatchData, setData]);
}
