// app/hooks/useAuctionListener.ts
import { useEffect } from 'react';
import Ably from 'ably/promises';

export function useAuctionListener(
  matchId: string,
  onNewOffer: (data: any) => void,
  onOfferAccepted?: (data: any) => void
) {
  useEffect(() => {
    if (!matchId) return;

    const ably = new Ably.Realtime.Promise({ key: process.env.NEXT_PUBLIC_ABLY_API_KEY! });
    const channel = ably.channels.get(`match-${matchId}-offers`);

    const newOfferHandler = (msg: any) => onNewOffer(msg.data);
    const offerAcceptedHandler = (msg: any) => onOfferAccepted?.(msg.data);

    channel.subscribe('new-offer', newOfferHandler);
    channel.subscribe('offer-accepted', offerAcceptedHandler);

    return () => {
      channel.unsubscribe('new-offer', newOfferHandler);
      channel.unsubscribe('offer-accepted', offerAcceptedHandler);
      ably.close();
    };
  }, [matchId]);
}
