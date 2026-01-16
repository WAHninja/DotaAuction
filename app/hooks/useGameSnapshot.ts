'use client';

import { useEffect, useRef, useState } from 'react';
import { getAblyClient } from '@/lib/ably-client';

export function useGameSnapshot(matchId: string) {
  const [snapshot, setSnapshot] = useState<any>(null);
  const ablyRef = useRef<any>(null);

  useEffect(() => {
    if (!matchId) return;

    ablyRef.current = getAblyClient();
    const channel = ablyRef.current.channels.get(`match-${matchId}`);

    const handler = (msg: any) => {
      if (msg.name !== 'snapshot') return;
      console.log('📦 snapshot received');
      setSnapshot(msg.data); // FULL replace — critical
    };

    channel.subscribe('snapshot', handler);

    return () => {
      channel.unsubscribe('snapshot', handler);
    };
  }, [matchId]);

  return snapshot;
}
