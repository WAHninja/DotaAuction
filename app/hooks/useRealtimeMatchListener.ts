import { useEffect } from 'react';
import ablyClient from '@/lib/ably-client';

type Callbacks = {
  fetchMatchData: () => void;
  fetchOffers?: (gameId: number) => void;
  fetchGameHistory?: () => void;
  fetchGamesPlayed?: () => void;
};

export function useRealtimeMatchListener(
  matchId: string,
  latestGameId: number | null,
  callbacks: Callbacks
) {
  const { fetchMatchData, fetchOffers, fetchGameHistory, fetchGamesPlayed } = callbacks;

  useEffect(() => {
    if (!matchId || !ablyClient) return;

    const matchChannel = ablyClient.channels.get(`match-${matchId}`);
    const offersChannel = latestGameId ? ablyClient.channels.get(`match-${matchId}-offers`) : null;

    // ---------------- Match Events ----------------
    const handleGameWinnerSelected = (msg: any) => {
      fetchMatchData();
      fetchGameHistory?.();
      fetchGamesPlayed?.();
    };

    matchChannel.subscribe('game-winner-selected', handleGameWinnerSelected);

    // ---------------- Auction Events ----------------
    const handleNewOffer = () => {
      if (latestGameId && fetchOffers) fetchOffers(latestGameId);
    };

    const handleOfferAccepted = () => {
      fetchMatchData();
      fetchGameHistory?.();
      fetchGamesPlayed?.();
    };

    offersChannel?.subscribe('new-offer', handleNewOffer);
    offersChannel?.subscribe('offer-accepted', handleOfferAccepted);

    // ---------------- Cleanup ----------------
    return () => {
      matchChannel.unsubscribe('game-winner-selected', handleGameWinnerSelected);
      offersChannel?.unsubscribe('new-offer', handleNewOffer);
      offersChannel?.unsubscribe('offer-accepted', handleOfferAccepted);
    };
  }, [matchId, latestGameId, fetchMatchData, fetchOffers, fetchGameHistory, fetchGamesPlayed]);
}
