// app/hooks/usePhaseListener.ts
//
// Listens for phase-changed broadcast events from the Supabase Edge Function
// that receives game state updates from the Dota 2 custom game.
// The edge function should broadcast on the `match-${matchId}` channel
// with event `phase-changed` and payload { gameId, matchId, phase }.

import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import supabaseClient from '@/lib/supabase-client';

export type PhaseChangedPayload = {
  gameId:  number;
  matchId: number;
  /** Raw DOTA_GAMERULES_STATE integer, e.g. 3 for PLAYER_DRAFT */
  phase:   number;
};

export function usePhaseListener(
  matchId: string,
  onPhaseChanged: (payload: PhaseChangedPayload) => void,
) {
  const callbackRef = useRef(onPhaseChanged);
  useEffect(() => { callbackRef.current = onPhaseChanged; }, [onPhaseChanged]);

  useEffect(() => {
    if (!matchId || !supabaseClient) return;

    const channel: RealtimeChannel = supabaseClient
      .channel(`match-${matchId}-phase`)
      .on('broadcast', { event: 'phase-changed' }, ({ payload }) => {
        callbackRef.current(payload as PhaseChangedPayload);
      })
      .subscribe();

    return () => {
      supabaseClient!.removeChannel(channel);
    };
  }, [matchId]);
}
