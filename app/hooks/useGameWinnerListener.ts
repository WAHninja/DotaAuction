// app/hooks/useGameWinnerListener.ts
import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import supabaseClient from '@/lib/supabase-client';

export function useGameWinnerListener(
  matchId: string,
  onGameWinnerSelected: () => void,
) {
  const callbackRef = useRef(onGameWinnerSelected);
  useEffect(() => { callbackRef.current = onGameWinnerSelected; }, [onGameWinnerSelected]);

  useEffect(() => {
    if (!matchId || !supabaseClient) return;

    const channel: RealtimeChannel = supabaseClient
      .channel(`match-${matchId}`)
      .on('broadcast', { event: 'game-winner-selected' }, () => {
        callbackRef.current();
      })
      .subscribe();

    return () => {
      supabaseClient!.removeChannel(channel);
    };
  }, [matchId]);
}
