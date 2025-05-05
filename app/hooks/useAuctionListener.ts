import { useEffect } from 'react';
import ablyClient from '@/lib/ably-client';

export function useAuctionListener(
  matchId: string,
  onNewOffer: (data: any) => void,
  onOfferAccepted?: (data: any) => void
) {
  useEffect(() => {
    if (!matchId || !ablyClient) return;

    const channel = ablyClient.channels.get(`match-${matchId}-offers`);

    const newOfferHandler = (msg: any) => onNewOffer(msg.data);
    const offerAcceptedHandler = (msg: any) => onOfferAccepted?.(msg.data);

    channel.subscribe('new-offer', newOfferHandler);
    channel.subscribe('offer-accepted', offerAcceptedHandler);

    return () => {
      channel.unsubscribe('new-offer', newOfferHandler);
      channel.unsubscribe('offer-accepted', offerAcceptedHandler);
    };
  }, [matchId, ablyClient, onNewOffer, onOfferAccepted]);
}
