import { useEffect, useRef } from 'react';
import ablyClient from '@/lib/ably-client';

type OfferAcceptedPayload = {
  acceptedOfferId: number;
  acceptedAmount: number;
  newGame: any;
};

export function useAuctionListener(
  matchId: string,
  latestGameId: number | null,
  onNewOffer: (offer: any) => void,
  onOfferAccepted: (payload: OfferAcceptedPayload) => void,
) {
  // Stable refs so the effect never re-subscribes just because a callback
  // identity changed between renders.
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
