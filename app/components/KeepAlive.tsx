'use client';

import { useEffect } from 'react';

// Pings /api/ping every INTERVAL_MS for up to DURATION_MS after the
// component mounts. This keeps Render's free-tier instance warm so the
// site doesn't spin down mid-session.
//
// Values:
//   INTERVAL_MS  10 minutes  — well within Render's 15-minute inactivity window
//   DURATION_MS   2 hours    — enough to cover a full Dota match

const INTERVAL_MS = 10 * 60 * 1000;  // 10 minutes
const DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export default function KeepAlive() {
  useEffect(() => {
    const startedAt = Date.now();

    const ping = async () => {
      try {
        await fetch('/api/ping', { cache: 'no-store' });
      } catch {
        // Silently ignore — a failed ping just means the site was already
        // awake or there's a network blip. Not worth surfacing to the user.
      }
    };

    // Ping immediately on mount so the very first visit resets the timer
    ping();

    const interval = setInterval(() => {
      if (Date.now() - startedAt >= DURATION_MS) {
        clearInterval(interval);
        return;
      }
      ping();
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Renders nothing — purely a side-effect component
  return null;
}
