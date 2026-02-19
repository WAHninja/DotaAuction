import { useEffect, useRef } from 'react';
import ablyClient from '@/lib/ably-client';

export function useAuctionListener(
  matchId: string,
  latestGameId: number | null,
  fetchMatchData: () => void,
  fetchOffers: (gameId: number) => void,
  fetchGameHistory: () => void,
) {
  // Keep latest versions of callbacks in refs so the effect never needs to
  // re-run (and re-subscribe) just because a callback identity changed.
  const fetchMatchDataRef   = useRef(fetchMatchData);
  const fetchOffersRef      = useRef(fetchOffers);
  const fetchGameHistoryRef = useRef(fetchGameHistory);

  useEffect(() => { fetchMatchDataRef.current   = fetchMatchData;  }, [fetchMatchData]);
  useEffect(() => { fetchOffersRef.current      = fetchOffers;     }, [fetchOffers]);
  useEffect(() => { fetchGameHistoryRef.current = fetchGameHistory; }, [fetchGameHistory]);

  useEffect(() => {
    if (!matchId || !ablyClient || !latestGameId) return;

    const channel = ablyClient.channels.get(`match-${matchId}-offers`);

    const handleNewOffer = () => {
      fetchOffersRef.current(latestGameId);
    };

    const handleOfferAccepted = () => {
      // Run both in parallel — they're independent of each other
      Promise.all([
        fetchMatchDataRef.current(),
        fetchGameHistoryRef.current(),
      ]);
    };

    channel.subscribe('new-offer', handleNewOffer);
    channel.subscribe('offer-accepted', handleOfferAccepted);

    return () => {
      channel.unsubscribe('new-offer', handleNewOffer);
      channel.unsubscribe('offer-accepted', handleOfferAccepted);
    };
  // Only re-subscribe when the channel itself needs to change
  }, [matchId, latestGameId]);
}
