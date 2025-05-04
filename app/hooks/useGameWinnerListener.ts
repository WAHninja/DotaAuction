import { useEffect } from 'react';
import ablyClient from '@/lib/ably-client';

export function useGameWinnerListener(matchId: string, onUpdate: () => void) {
  useEffect(() => {
    if (!ablyClient) return;

    const channel = ablyClient.channels.get('match-' + matchId);

    const handler = (msg: any) => {
      if (msg.name === 'game-winner-selected') {
        onUpdate();
      }
    };

    channel.subscribe('game-winner-selected', handler);

    return () => {
      channel.unsubscribe('game-winner-selected', handler);
    };
  }, [matchId, onUpdate]);
}
