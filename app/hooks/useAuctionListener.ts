import { useEffect } from 'react';
import ablyClient from '@/lib/ably-client';

export function useAuctionListener(
  matchId: string,
  latestGameId: number | null,
  fetchMatchData: () => void,
  fetchOffers: (gameId: number) => void
) {
  useEffect(() => {
    if (!matchId || !ablyClient || !latestGameId) return;

    const channel = ablyClient.channels.get(`match-${matchId}-offers`);

    const handleNewOffer = () => {
      fetchOffers(latestGameId);
    };

    const handleOfferAccepted = () => {
      fetchMatchData();
    };

    channel.subscribe('new-offer', handleNewOffer);
    channel.subscribe('offer-accepted', handleOfferAccepted);

    return () => {
      channel.unsubscribe('new-offer', handleNewOffer);
      channel.unsubscribe('offer-accepted', handleOfferAccepted);
    };
  }, [matchId, latestGameId, fetchMatchData, fetchOffers]);
}
