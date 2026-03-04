// app/hooks/useChangelogBadge.ts
//
// Returns true if the current user has unseen patch notes.
//
// The `enabled` flag must be true before the fetch fires. Pass `!!user` at
// the call site so logged-out visitors never hit /api/changelog at all.
// The endpoint requires auth and returns 401 when unauthenticated — the
// previous version silently fired a fetch on every page load for logged-out
// users, producing a redundant 401 in the console on every navigation.

import { useEffect, useState } from 'react';

export function useChangelogBadge(enabled: boolean): boolean {
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    fetch('/api/changelog')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data) setHasUnseen(data.hasUnseen); })
      .catch(() => {});
  }, [enabled]);

  return hasUnseen;
}
