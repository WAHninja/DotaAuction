import { useEffect, useRef } from 'react';
import ablyClient from '@/lib/ably-client';
import type { NewOfferPayload, OfferAcceptedPayload } from '@/types';

export function useAuctionListener(
  matchId: string,
  latestGameId: number | null,
  onNewOffer: (offer: NewOfferPayload) => void,
  onOfferAccepted: (payload: OfferAcceptedPayload) => void,
) {
  const onNewOfferRef      = useRef(onNewOffer);
  const onOfferAcceptedRef = useRef(onOfferAccepted);

  useEffect(() => { onNewOfferRef.current      = onNewOffer;      }, [onNewOffer]);
  useEffect(() => { onOfferAcceptedRef.current = onOfferAccepted; }, [onOfferAccepted]);

  useEffect(() => {
    if (!matchId || !ablyClient || !latestGameId) return;

    const channel = ablyClient.channels.get(`match-${matchId}-offers`);

    const handleNewOffer = (msg: any) => {
      onNewOfferRef.current(msg.data);
    };

    const handleOfferAccepted = (msg: any) => {
      onOfferAcceptedRef.current(msg.data);
    };

    channel.subscribe('new-offer', handleNewOffer);
    channel.subscribe('offer-accepted', handleOfferAccepted);

    return () => {
      channel.unsubscribe('new-offer', handleNewOffer);
      channel.unsubscribe('offer-accepted', handleOfferAccepted);
    };
  }, [matchId, latestGameId]);
}
