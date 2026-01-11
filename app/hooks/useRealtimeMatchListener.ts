import { useEffect, useRef } from 'react';
import { getAblyClient } from '@/lib/ably-client';

type Callbacks = {
  fetchMatchData: () => Promise<void> | void;
  setData?: React.Dispatch<React.SetStateAction<any>>; // optional, for immediate updates
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

    const onGameCreated = async (eventData?: any) => {
      console.log('📡 game-created event received', eventData);

      // Immediately update latestGame in state if setData is provided
      if (eventData?.gameId && setData) {
        setData((prev: any) => {
          if (!prev) return prev;
          const existingGames = prev.games || [];
          // Avoid duplicates
          if (existingGames.find((g: any) => g.id === eventData.gameId)) return prev;
          const newGame = {
            id: eventData.gameId,
            status: 'in progress',
            team_a_members: [],
            team_1_members: [],
          };
          return {
            ...prev,
            games: [...existingGames, newGame],
            latestGame: newGame,
          };
        });
      }

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
  }, [matchId, fetchMatchData, setData]);

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

      // Immediately add new game if available in event
      if (data?.gameId && setData) {
        setData((prev: any) => {
          if (!prev) return prev;
          const existingGames = prev.games || [];
          if (existingGames.find((g: any) => g.id === data.gameId)) return prev;
          const newGame = {
            id: data.gameId,
            status: 'in progress',
            team_a_members: [],
            team_1_members: [],
          };
          return {
            ...prev,
            games: [...existingGames, newGame],
            latestGame: newGame,
          };
        });
      }

      await fetchMatchData();
    };

    channel.subscribe('new-offer', onNewOffer);
    channel.subscribe('offer-accepted', onOfferAccepted);

    // Cleanup: unsubscribe specific events
    return () => {
      channel.unsubscribe('new-offer', onNewOffer);
      channel.unsubscribe('offer-accepted', onOfferAccepted);
    };
  }, [matchId, latestGameId, fetchMatchData, setData]);
}
