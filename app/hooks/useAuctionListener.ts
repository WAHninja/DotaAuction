import { useEffect } from 'react';
import ablyClient from '@/lib/ably-client';

export function useAuctionListener(matchId: number, onOfferCreated: Function, onOfferAccepted: Function) {
  useEffect(() => {
    if (!ablyClient) return;

    const channel = ablyClient.channels.get('match-' + matchId);

    const handleOfferCreated = (msg: any) => {
      onOfferCreated(msg.data);
    };

    const handleOfferAccepted = (msg: any) => {
      onOfferAccepted(msg.data);
    };

    channel.subscribe('offer-created', handleOfferCreated);
    channel.subscribe('offer-accepted', handleOfferAccepted);

    return () => {
      channel.unsubscribe('offer-created', handleOfferCreated);
      channel.unsubscribe('offer-accepted', handleOfferAccepted);
    };
  }, [matchId, onOfferCreated, onOfferAccepted]);
}
