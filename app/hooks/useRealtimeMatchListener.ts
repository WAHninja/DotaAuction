import { useEffect, useRef } from 'react';
import { getAblyClient } from '@/lib/ably-client';
import type { Realtime } from 'ably';

type Callbacks = {
  fetchMatchData: () => Promise<void> | void;
  setData?: React.Dispatch<React.SetStateAction<any>>;
};

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  { fetchMatchData, setData }: Callbacks
) {
  const ablyRef = useRef<Realtime | null>(null);

  // ---------------- Initialize Ably client once ----------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!ablyRef.current) {
      ablyRef.current = getAblyClient();
      console.log('✅ Ably client initialized (hook)');
    }
  }, []);

  // ---------------- Match / game lifecycle events ----------------
  useEffect(() => {
    if (!matchId || !ablyRef.current) return;

    const matchChannel = ablyRef.current.channels.get(`match-${matchId}`);

    const onGameUpdated = (msg: any) => {
      console.log('📡 game-updated', msg.data);
      fetchMatchData();
    };

    const onGameCreated = (msg: any) => {
      console.log('📡 game-created', msg.data);
      fetchMatchData();
    };

    const onWinnerSelected = (msg: any) => {
      console.log('📡 game-winner-selected', msg.data);
      fetchMatchData();
    };

    matchChannel.subscribe('game-updated', onGameUpdated);
    matchChannel.subscribe('game-created', onGameCreated);
    matchChannel.subscribe('game-winner-selected', onWinnerSelected);

    return () => {
      matchChannel.unsubscribe('game-updated', onGameUpdated);
      matchChannel.unsubscribe('game-created', onGameCreated);
      matchChannel.unsubscribe('game-winner-selected', onWinnerSelected);
    };
  }, [matchId, fetchMatchData]);

  // ---------------- Auction / offers events ----------------
  useEffect(() => {
    if (!latestGameId || !matchId || !ablyRef.current) return;

    const offersChannel = ablyRef.current.channels.get(
      `match-${matchId}-offers`
    );

    const onNewOffer = (msg: any) => {
      console.log('📡 new-offer', msg.data);

      if (!msg.data) return;

      // If server sends full offers array
      const newOffers = msg.data.offers ?? (msg.data.offer ? [msg.data.offer] : []);
      if (!setData) {
        fetchMatchData();
        return;
      }

      setData((prev: any) => {
        if (!prev?.latestGame) return prev;

        // Merge offers, prevent duplicates by ID
        const existingOffers = prev.latestGame.offers ?? [];
        const merged = [...existingOffers];

        for (const offer of newOffers) {
          if (!merged.find((o: any) => o.id === offer.id)) {
            merged.push(offer);
          }
        }

        return {
          ...prev,
          latestGame: {
            ...prev.latestGame,
            offers: merged,
          },
        };
      });
    };

    const onOfferAccepted = (msg: any) => {
      console.log('📡 offer-accepted', msg.data);
      fetchMatchData();
    };

    offersChannel.subscribe('new-offer', onNewOffer);
    offersChannel.subscribe('offer-accepted', onOfferAccepted);

    return () => {
      offersChannel.unsubscribe('new-offer', onNewOffer);
      offersChannel.unsubscribe('offer-accepted', onOfferAccepted);
    };
  }, [matchId, latestGameId, fetchMatchData, setData]);
}
