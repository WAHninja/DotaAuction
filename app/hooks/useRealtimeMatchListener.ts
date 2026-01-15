import { useEffect, useRef } from 'react';
import { getAblyClient } from '@/lib/ably-client';

type Callbacks = {
  fetchMatchData: () => Promise<void> | void;
  setData?: React.Dispatch<React.SetStateAction<any>>; // optional, for immediate fine-grained updates
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

    const onGameCreated = (eventData?: any) => {
      console.log('📡 game-created event', eventData);

      if (eventData?.game && setData) {
        setData((prev: any) => {
          if (!prev) return prev;
          const existingGames = prev.games || [];
          if (existingGames.find((g: any) => g.id === eventData.game.id)) return prev;

          return {
            ...prev,
            games: [...existingGames, eventData.game],
            latestGame: eventData.game,
          };
        });
      } else {
        fetchMatchData();
      }
    };

    const onGameWinnerSelected = (eventData?: any) => {
      console.log('📡 game-winner-selected event', eventData);

      if (eventData?.gameId && setData) {
        setData((prev: any) => {
          if (!prev) return prev;
          const updatedGames = prev.games.map((g: any) =>
            g.id === eventData.gameId ? { ...g, winning_team: eventData.winningTeam } : g
          );
          return { ...prev, games: updatedGames };
        });
      } else {
        fetchMatchData();
      }
    };

    const onGameFinished = (eventData?: any) => {
      console.log('📡 game-finished event', eventData);
      fetchMatchData();
    };

    const onNewGame = (eventData?: any) => {
      console.log('📡 new-game event', eventData);

      if (eventData?.game && setData) {
        setData((prev: any) => {
          if (!prev) return prev;
          const existingGames = prev.games || [];
          if (existingGames.find((g: any) => g.id === eventData.game.id)) return prev;

          return {
            ...prev,
            games: [...existingGames, eventData.game],
            latestGame: eventData.game,
          };
        });
      } else {
        fetchMatchData();
      }
    };

    // Subscribe
    channel.subscribe('game-created', onGameCreated);
    channel.subscribe('game-winner-selected', onGameWinnerSelected);
    channel.subscribe('game-finished', onGameFinished);
    channel.subscribe('new-game', onNewGame);

    return () => {
      channel.unsubscribe('game-created', onGameCreated);
      channel.unsubscribe('game-winner-selected', onGameWinnerSelected);
      channel.unsubscribe('game-finished', onGameFinished);
      channel.unsubscribe('new-game', onNewGame);
    };
  }, [matchId, fetchMatchData, setData]);

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

    const onOfferAccepted = (data?: any) => {
      console.log('📡 offer-accepted event', data);

      if (data?.offer && setData) {
        setData((prev: any) => {
          if (!prev) return prev;
          const updatedOffers = (prev.latestGame?.offers || []).map((o: any) =>
            o.id === data.offer.id ? { ...o, status: 'accepted' } : o
          );

          let updatedGames = prev.games;
          if (data.newGame && !prev.games.find((g: any) => g.id === data.newGame.id)) {
            updatedGames = [...prev.games, data.newGame];
          }

          return {
            ...prev,
            latestGame: {
              ...prev.latestGame,
              offers: updatedOffers,
            },
            games: updatedGames,
          };
        });
      } else {
        fetchMatchData();
      }
    };

    channel.subscribe('new-offer', onNewOffer);
    channel.subscribe('offer-accepted', onOfferAccepted);

    return () => {
      channel.unsubscribe('new-offer', onNewOffer);
      channel.unsubscribe('offer-accepted', onOfferAccepted);
    };
  }, [matchId, latestGameId, fetchMatchData, setData]);
}
