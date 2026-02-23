import { useEffect, useState } from 'react';
import supabaseClient from '@/lib/supabase-client';

/**
 * Tracks which users currently have the site open using Supabase Presence.
 *
 * Every client that calls this hook joins the shared "online-users" channel
 * and broadcasts their user ID. The hook returns a live Set of all currently
 * connected user IDs — updated instantly when anyone joins or leaves.
 *
 * Presence key = userId string so multiple tabs for the same user collapse
 * into a single slot rather than inflating the count.
 */
export function useOnlineUsers(currentUserId: number | null): Set<number> {
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!currentUserId || !supabaseClient) return;

    const channel = supabaseClient.channel('online-users', {
      config: {
        presence: {
          // One slot per user — opening a second tab won't double-count them.
          key: String(currentUserId),
        },
      },
    });

    // Rebuild the full set from the authoritative presenceState snapshot.
    // Doing this on every event (sync/join/leave) is simpler and more
    // reliable than trying to patch the set incrementally from deltas.
    const syncState = () => {
      const state = channel.presenceState<{ user_id: number }>();
      const ids = new Set(
        Object.values(state)
          .flat()
          .map((p) => p.user_id)
      );
      setOnlineIds(ids);
    };

    channel
      .on('presence', { event: 'sync' },  syncState)
      .on('presence', { event: 'join' },  syncState)
      .on('presence', { event: 'leave' }, syncState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce this client to everyone else on the channel.
          await channel.track({ user_id: currentUserId });
        }
      });

    return () => {
      // untrack() tells the server to evict this client immediately rather
      // than waiting for the socket heartbeat timeout (~30s). The dot
      // disappears the moment the user navigates away or closes the tab.
      channel.untrack();
      supabaseClient!.removeChannel(channel);
    };
  }, [currentUserId]);

  return onlineIds;
}
