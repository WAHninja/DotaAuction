import { useEffect } from 'react';
import ablyClient from '@/lib/ably-client';

export function useGameWinnerListener(matchId: string, onUpdate: () => void) {
  useEffect(() => {
    if (!matchId) return;

    let channel: any;

    const subscribe = async () => {
      const client = await ablyClient; // Await the promise
      channel = client.channels.get('match-' + matchId);

      const handler = (msg: any) => {
        if (msg.name === 'game-winner-selected') {
          onUpdate();
        }
      };

      channel.subscribe('game-winner-selected', handler);
    };

    subscribe();

    return () => {
      if (channel) {
        channel.unsubscribe('game-winner-selected');
      }
    };
  }, [matchId, onUpdate]);
}
