'use client';

import { useEffect, useRef, useState } from 'react';
import { getAblyClient } from '@/lib/ably-client';

export function useGameSnapshot(matchId: string | null) {
  const [snapshot, setSnapshot] = useState<any>(null);
  const ablyRef = useRef<any>(null);

  // ---------------- Initial API fetch ----------------
  useEffect(() => {
    if (!matchId) return;

    fetch(`/api/match/${matchId}`)
      .then(res => res.json())
      .then(data => setSnapshot(data))
      .catch(err => console.error('Failed to fetch snapshot', err));
  }, [matchId]);

  // ---------------- Ably subscription ----------------
  useEffect(() => {
    if (!matchId) return;

    ablyRef.current = getAblyClient();
    const channel = ablyRef.current.channels.get(`match-${matchId}`);

    const handler = (msg: any) => {
      if (msg.name !== 'snapshot') return;
      console.log('📦 snapshot received', msg.data);
      setSnapshot(msg.data); // full replace
    };

    channel.subscribe('snapshot', handler);

    return () => {
      channel.unsubscribe('snapshot', handler);
    };
  }, [matchId]);

  return snapshot;
}
