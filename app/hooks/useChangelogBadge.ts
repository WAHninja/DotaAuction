// app/hooks/useChangelogBadge.ts
//
// Returns true if the current user has unseen patch notes.
//
// `enabled` must be true before the fetch fires — pass `!!user` at the
// call site so logged-out visitors never hit /api/changelog at all.
// (The endpoint requires auth and returns 401 when unauthenticated, so
// the old version was harmless but wasteful and caused a redundant
// network error in the console on every page load while logged out.)

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
