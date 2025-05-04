import { useEffect } from 'react';
import ablyClient from '@/lib/ably-client';

export function useGameWinnerListener(matchId: string, onUpdate: () => void) {
  useEffect(() => {
    const channel = ablyClient.channels.get('match-' + matchId);

    const handler = (msg: any) => {
      if (msg.name === 'game-winner-selected') {
        onUpdate(); // Trigger refetch or state update
      }
    };

    channel.subscribe('game-winner-selected', handler);

    return () => {
      channel.unsubscribe('game-winner-selected', handler);
    };
  }, [matchId, onUpdate]);
}
