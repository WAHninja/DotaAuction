import { useEffect, useRef } from 'react';
import { getMatchChannels, getAblyClient } from '@/lib/ably-client';

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
      console.log('✅ Ably client initialized (hook)');
    }
  }, []);

  // ---------------- Subscribe to match-level channels ----------------
  useEffect(() => {
    if (!matchId || !ablyClientRef.current) return;

    const { offers: offersChannel, game: gameChannel } = getMatchChannels(Number(matchId));

    // ---------------- General game updates ----------------
    const handleGameUpdated = (data?: any) => {
      console.log('📡 game-updated event', data);
      fetchMatchData();
    };
    const handleGameCreated = (data?: any) => {
      console.log('📡 game-created event', data);
      fetchMatchData();
    };
    const handleWinnerSelected = (data?: any) => {
      console.log('📡 game-winner-selected event', data);
      fetchMatchData();
    };

    gameChannel.subscribe('game-updated', handleGameUpdated);
    gameChannel.subscribe('game-created', handleGameCreated);
    gameChannel.subscribe('game-winner-selected', handleWinnerSelected);

    return () => {
      gameChannel.unsubscribe('game-updated', handleGameUpdated);
      gameChannel.unsubscribe('game-created', handleGameCreated);
      gameChannel.unsubscribe('game-winner-selected', handleWinnerSelected);
    };
  }, [matchId, fetchMatchData]);

  // ---------------- Auction / offers updates ----------------
  useEffect(() => {
    if (!latestGameId || !matchId || !ablyClientRef.current) return;

    const { offers: offersChannel } = getMatchChannels(Number(matchId));

    const handleNewOffer = (data?: any) => {
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

    const handleOfferAccepted = (data?: any) => {
      console.log('📡 offer-accepted event', data);
      fetchMatchData();
    };

    offersChannel.subscribe('new-offer', handleNewOffer);
    offersChannel.subscribe('offer-accepted', handleOfferAccepted);

    return () => {
      offersChannel.unsubscribe('new-offer', handleNewOffer);
      offersChannel.unsubscribe('offer-accepted', handleOfferAccepted);
    };
  }, [matchId, latestGameId, fetchMatchData, setData]);
}
