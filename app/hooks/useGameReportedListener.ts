// app/hooks/useGameReportedListener.ts
//
// Fires when the Dota 2 VScript plugin reports a finished game to the
// Edge Function and the Edge Function broadcasts the result.
// The match page uses this to refresh automatically without polling.

import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import supabaseClient from '@/lib/supabase-client';

type GameReportedPayload = {
  gameId:      number;
  matchId:     number;
  winningTeam: 'team_1' | 'team_a';
};

export function useGameReportedListener(
  matchId: string,
  onGameReported: (payload: GameReportedPayload) => void,
) {
  const callbackRef = useRef(onGameReported);
  useEffect(() => { callbackRef.current = onGameReported; }, [onGameReported]);

  useEffect(() => {
    if (!matchId || !supabaseClient) return;

    const channel: RealtimeChannel = supabaseClient
      .channel(`match-${matchId}-dota`)
      .on('broadcast', { event: 'game-reported' }, ({ payload }) => {
        callbackRef.current(payload as GameReportedPayload);
      })
      .subscribe();

    return () => {
      supabaseClient!.removeChannel(channel);
    };
  }, [matchId]);
}
