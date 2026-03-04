// app/hooks/useChangelogBadge.ts
// Returns true if the current user has unseen patch notes.
// Called once on mount — no polling needed since notes rarely change.

import { useEffect, useState } from 'react';

export function useChangelogBadge(): boolean {
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    fetch('/api/changelog')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setHasUnseen(data.hasUnseen); })
      .catch(() => {});
  }, []);

  return hasUnseen;
}
