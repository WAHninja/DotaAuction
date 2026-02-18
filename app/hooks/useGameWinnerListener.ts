import { useEffect, useRef } from 'react';
import ablyClient from '@/lib/ably-client';

export function useGameWinnerListener(
  matchId: string,
  onGameWinnerSelected: () => void,
) {
  // Stable ref so the effect doesn't re-subscribe on every render
  const callbackRef = useRef(onGameWinnerSelected);
  useEffect(() => { callbackRef.current = onGameWinnerSelected; }, [onGameWinnerSelected]);

  useEffect(() => {
    if (!matchId || !ablyClient) return;

    const channel = ablyClient.channels.get(`match-${matchId}`);

    const handler = (msg: any) => {
      if (msg.name === 'game-winner-selected') {
        callbackRef.current();
      }
    };

    channel.subscribe('game-winner-selected', handler);

    return () => {
      channel.unsubscribe('game-winner-selected', handler);
    };
  // Only re-subscribe when the match channel changes
  }, [matchId]);
}
