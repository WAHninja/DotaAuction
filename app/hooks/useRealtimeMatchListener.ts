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

  // ---------------- Initialize Ably client ----------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ablyClientRef.current) ablyClientRef.current = getAblyClient();
  }, []);

  // ---------------- Match-level events ----------------
  useEffect(() => {
    if (!matchId || !ablyClientRef.current) return;
    const channel = ablyClientRef.current.channels.get(`match-${matchId}`);

    const onGameCreated = (data?: any) => {
      if (data?.game && setData) {
        setData((prev: any) => {
          if (!prev) return prev;
          const exists = prev.games?.find((g: any) => g.id === data.game.id)
          if (exists) return prev;
          return { ...prev, games: [...(prev.games || []), data.game], latestGame: data.game };
        });
      } else fetchMatchData();
    };

    const onGameWinnerSelected = (data?: any) => {
      if (data?.gameId && setData) {
        setData((prev: any) => ({
          ...prev,
          games: prev.games.map((g: any) =>
            g.id === data.gameId ? { ...g, winning_team: data.winningTeam } : g
          ),
        }));
      } else fetchMatchData();
    };

    channel.subscribe('game-created', onGameCreated);
    channel.subscribe('game-winner-selected', onGameWinnerSelected);

    return () => {
      channel.unsubscribe('game-created', onGameCreated);
      channel.unsubscribe('game-winner-selected', onGameWinnerSelected);
    };
  }, [matchId, fetchMatchData, setData]);

  // ---------------- Auction-level events ----------------
  useEffect(() => {
    if (!latestGameId || !matchId || !ablyClientRef.current) return;
    const channel = ablyClientRef.current.channels.get(`match-${matchId}-offers`);

    const onNewOffer = (data?: any) => {
      if (data?.offer && setData) {
        setData((prev: any) => {
          if (!prev) return prev;
          const updatedOffers = [...(prev.latestGame?.offers || []), data.offer];
          return { ...prev, latestGame: { ...prev.latestGame, offers: updatedOffers } };
        });
      } else fetchMatchData();
    };

    const onOfferAccepted = (data?: any) => {
      if (data?.offer && setData) {
        setData((prev: any) => {
          if (!prev) return prev;

          // Update offers status
          const updatedOffers = (prev.latestGame?.offers || []).map((o: any) =>
            o.id === data.offer.id ? { ...o, status: 'accepted' } : o
          );

          // Add new game if present
          let updatedGames = prev.games;
          if (data.newGame && !prev.games.find((g: any) => g.id === data.newGame.id)) {
            updatedGames = [...prev.games, data.newGame];
          }

          return { ...prev, latestGame: { ...prev.latestGame, offers: updatedOffers }, games: updatedGames };
        });
      } else fetchMatchData();
    };

    channel.subscribe('new-offer', onNewOffer);
    channel.subscribe('offer-accepted', onOfferAccepted);

    return () => {
      channel.unsubscribe('new-offer', onNewOffer);
      channel.unsubscribe('offer-accepted', onOfferAccepted);
    };
  }, [matchId, latestGameId, fetchMatchData, setData]);
}
