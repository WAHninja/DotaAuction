// app/hooks/useAuctionListener.ts
import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import supabaseClient from '@/lib/supabase-client';
import type { NewOfferPayload, OfferAcceptedPayload, OfferSelectingPayload } from '@/types';

export function useAuctionListener(
  matchId: string,
  latestGameId: number | null,
  onNewOffer: (offer: NewOfferPayload) => void,
  onOfferAccepted: (payload: OfferAcceptedPayload) => void,
  onOfferSelecting?: (payload: OfferSelectingPayload) => void,
) {
  const onNewOfferRef       = useRef(onNewOffer);
  const onOfferAcceptedRef  = useRef(onOfferAccepted);
  const onOfferSelectingRef = useRef(onOfferSelecting);
  const channelRef          = useRef<RealtimeChannel | null>(null);

  useEffect(() => { onNewOfferRef.current       = onNewOffer;       }, [onNewOffer]);
  useEffect(() => { onOfferAcceptedRef.current  = onOfferAccepted;  }, [onOfferAccepted]);
  useEffect(() => { onOfferSelectingRef.current = onOfferSelecting; }, [onOfferSelecting]);

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
      // Ephemeral, client-broadcast-only signal — a losing-team member marking
      // which offer they're currently leaning towards, so teammates can see it
      // live without saying it out loud where the winning team might overhear.
      // Not persisted anywhere; purely a live discussion aid.
      .on('broadcast', { event: 'offer-selecting' }, ({ payload }) => {
        onOfferSelectingRef.current?.(payload as OfferSelectingPayload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabaseClient!.removeChannel(channel);
    };
  }, [matchId, latestGameId]);

  // Sent straight from the browser on the already-subscribed channel — no
  // server round-trip needed since this is just a live UI hint, not
  // authoritative game state.
  const sendSelection = useCallback((payload: OfferSelectingPayload) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'offer-selecting',
      payload,
    });
  }, []);

  return { sendSelection };
}
