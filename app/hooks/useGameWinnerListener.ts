import { useEffect } from 'react';
import ablyClient from '@/lib/ably-client';

export function useGameWinnerListener(
  matchId: string,
  onGameWinnerSelected: () => void
) {
  useEffect(() => {
    if (!matchId || !ablyClient) return;

    const channel = ablyClient.channels.get(`match-${matchId}`);

    const handler = (msg: any) => {
      if (msg.name === 'game-winner-selected') {
        onGameWinnerSelected(); // e.g. fetchMatchData + fetchGameHistory + fetchGamesPlayed
      }
    };

    channel.subscribe('game-winner-selected', handler);

    return () => {
      channel.unsubscribe('game-winner-selected', handler);
    };
  }, [matchId, onGameWinnerSelected]);
}
