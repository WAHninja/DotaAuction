// app/hooks/useAuctionListener.ts
import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import supabaseClient from '@/lib/supabase-client';
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
    if (!matchId || !supabaseClient || !latestGameId) return;

    const channelName = `match-${matchId}-offers`;

    const channel: RealtimeChannel = supabaseClient
      .channel(channelName)
      .on('broadcast', { event: 'new-offer' }, ({ payload }) => {
        onNewOfferRef.current(payload as NewOfferPayload);
      })
      .on('broadcast', { event: 'offer-accepted' }, ({ payload }) => {
        onOfferAcceptedRef.current(payload as OfferAcceptedPayload);
      })
      .subscribe();

    return () => {
      supabaseClient!.removeChannel(channel);
    };
  }, [matchId, latestGameId]);
}
