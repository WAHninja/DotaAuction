'use client';

// app/whiteboard/WhiteboardClient.tsx
//
// Collaborative whiteboard powered by tldraw + @tldraw/sync.
//
// Uses `useSyncDemo` from the tldraw multiplayer starter kit:
//   https://tldraw.dev/docs/sync
//
// useSyncDemo connects to tldraw's public demo sync server — perfect for
// a private friend-group app. Data is ephemeral (rooms reset after
// inactivity) which is exactly what you want for a "scratchpad during a
// session" use case.
//
// For persistent storage, swap useSyncDemo for useTldrawUser + a custom
// sync server (the tldraw self-host starter kit provides one).

import { useEffect, useRef, useState, useContext } from 'react';
import { Tldraw, DefaultColorThemePalette } from 'tldraw';
import { useSyncDemo } from '@tldraw/sync';
import 'tldraw/tldraw.css';
import Link from 'next/link';
import { ArrowLeft, Users, Wifi, WifiOff } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  roomId:   string;
  username: string;
  userId:   number;
};

// ---------------------------------------------------------------------------
// Presence indicator
// ---------------------------------------------------------------------------

function ConnectionBadge({ status }: { status: 'connecting' | 'online' | 'offline' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-barlow text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
        status === 'online'
          ? 'bg-dota-radiant/15 border-dota-radiant/40 text-dota-radiant-light'
          : status === 'connecting'
          ? 'bg-dota-gold/10 border-dota-gold/30 text-dota-gold animate-pulse'
          : 'bg-dota-dire/10 border-dota-dire-border text-dota-dire-light'
      }`}
    >
      {status === 'online'
        ? <Wifi className="w-3 h-3" />
        : status === 'connecting'
        ? <Wifi className="w-3 h-3" />
        : <WifiOff className="w-3 h-3" />
      }
      {status === 'online' ? 'Live' : status === 'connecting' ? 'Connecting…' : 'Offline'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// WhiteboardClient
// ---------------------------------------------------------------------------

export default function WhiteboardClient({ roomId, username, userId }: Props) {
  const [connStatus, setConnStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  // useSyncDemo is the multiplayer hook from @tldraw/sync. It connects this
  // client to tldraw's public demo sync server via WebSocket. All clients
  // in the same roomId see each other's changes and cursors in real time.
  //
  // The `userInfo` object is broadcast to other clients — tldraw displays
  // it next to each user's cursor automatically.
  const store = useSyncDemo({
    roomId,
    userInfo: {
      id:    String(userId),
      name:  username,
      color: colorForUserId(userId),
    },
  });

  // Track connection status from the store's sync status.
  // The tldraw store exposes a `status` field on the sync object.
  useEffect(() => {
    const status = store?.status;
    if (status === 'synced-remote' || status === 'synced-local') {
      setConnStatus('online');
    } else if (status === 'error') {
      setConnStatus('offline');
    } else {
      setConnStatus('connecting');
    }
  }, [store]);

  // Poll the store status since it updates asynchronously
  useEffect(() => {
    const interval = setInterval(() => {
      // @ts-expect-error
      const s = store?.status;
      if (s === 'synced-remote' || s === 'synced-local') setConnStatus('online');
      else if (s === 'error') setConnStatus('offline');
      else setConnStatus('connecting');
    }, 1000);
    return () => clearInterval(interval);
  }, [store]);

  return (
    // The whiteboard takes the full viewport below the sticky app header.
    // We break out of the main container's padding by using negative margins.
    <div
      className="fixed inset-0 z-30 flex flex-col"
      style={{ top: 0 }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        className="
          relative z-40 flex items-center justify-between gap-4
          px-4 py-2.5
          bg-dota-surface/95 backdrop-blur-md
          border-b border-dota-border
          shadow-raised
        "
        style={{ height: 52 }}
      >
        {/* Left: back link + room label */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="
              shrink-0 flex items-center gap-1.5
              font-barlow text-sm font-semibold text-dota-text-muted
              hover:text-dota-gold transition-colors
            "
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <span aria-hidden="true" className="w-px h-4 bg-dota-border shrink-0" />

          <div className="min-w-0">
            <p className="font-cinzel font-bold text-sm text-dota-gold leading-none">
              Whiteboard
            </p>
          </div>
        </div>

        {/* Right: connection status */}
        <div className="flex items-center gap-2 shrink-0">
          <ConnectionBadge status={connStatus} />
        </div>
      </div>

      {/* ── tldraw canvas ──────────────────────────────────────────────── */}
      {/*
        tldraw fills its container. The container is positioned absolute
        to fill the remainder of the viewport below the toolbar.
        We override tldraw's default light theme with CSS variables — see
        the <style> block below for the dark theme overrides.
      */}
      <div className="flex-1 relative overflow-hidden tldraw-dark-host">
        <Tldraw
          store={store}
          // inferDarkMode reads prefers-color-scheme. Since DotA always uses
          // a dark background, we force dark mode explicitly.
          forceMobile={false}
          className="tldraw-full"
        />
      </div>

      {/* ── Dark-mode CSS overrides ────────────────────────────────────── */}
      {/*
        tldraw uses CSS custom properties for theming. Overriding them on a
        parent container is the recommended way to customise colours without
        forking tldraw itself. These values match the DotA dark palette.
        See: https://tldraw.dev/docs/theming
      */}
      <style>{`
        /* Force tldraw into dark mode */
        .tldraw-dark-host .tl-background {
          background-color: #111827;
        }

        /* tldraw's own dark theme variables */
        .tldraw-dark-host [data-color-scheme] {
          color-scheme: dark;
        }

        /* Toolbar and panel background */
        .tldraw-dark-host .tlui-toolbar,
        .tldraw-dark-host .tlui-popover__content,
        .tldraw-dark-host .tlui-menu__content {
          background-color: #1a2035 !important;
          border-color: #2e3d56 !important;
        }

        /* Full height canvas */
        .tldraw-full {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Deterministic colour from userId — same player always gets the same cursor colour.
// Uses the same hue set as tldraw's built-in palette.
const CURSOR_COLOURS = [
  '#FF802B', // orange
  '#EC5E41', // red
  '#13BD8F', // green
  '#4D7BCC', // blue
  '#9D5BD2', // purple
  '#E8B532', // yellow
  '#FF4D4D', // crimson
  '#3AB3C6', // cyan
];

function colorForUserId(id: number): string {
  return CURSOR_COLOURS[id % CURSOR_COLOURS.length];
}
