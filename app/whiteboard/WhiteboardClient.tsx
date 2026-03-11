'use client';

import { useEffect, useRef, useState } from 'react';
import { Tldraw } from 'tldraw';
import { useSyncDemo } from '@tldraw/sync';
import 'tldraw/tldraw.css';
import Link from 'next/link';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';

type Props = {
  roomId:   string;
  username: string;
  userId:   number;
};

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
      {status === 'offline' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
      {status === 'online' ? 'Live' : status === 'connecting' ? 'Connecting…' : 'Offline'}
    </span>
  );
}

const CURSOR_COLOURS = [
  '#FF802B', '#EC5E41', '#13BD8F', '#4D7BCC',
  '#9D5BD2', '#E8B532', '#FF4D4D', '#3AB3C6',
];

function colorForUserId(id: number): string {
  return CURSOR_COLOURS[id % CURSOR_COLOURS.length];
}

export default function WhiteboardClient({ roomId, username, userId }: Props) {
  const [connStatus, setConnStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  const store = useSyncDemo({
    roomId,
    userInfo: {
      id:    String(userId),
      name:  username,
      color: colorForUserId(userId),
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const s = store?.status;
      if (s === 'error')        setConnStatus('offline');
      else if (s === 'loading') setConnStatus('connecting');
      else                      setConnStatus('online');
    }, 1000);
    return () => clearInterval(interval);
  }, [store]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#111827]">

      {/* ── Toolbar ── */}
      <div
        className="
          shrink-0 flex items-center justify-between gap-4
          px-4 py-2.5 z-10
          bg-dota-surface/95 backdrop-blur-md
          border-b border-dota-border shadow-raised
        "
        style={{ height: 52 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="shrink-0 flex items-center gap-1.5 font-barlow text-sm font-semibold text-dota-text-muted hover:text-dota-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <span aria-hidden="true" className="w-px h-4 bg-dota-border shrink-0" />

          <p className="font-cinzel font-bold text-sm text-dota-gold leading-none">
            Whiteboard
          </p>
        </div>

        <ConnectionBadge status={connStatus} />
      </div>

      {/* ── tldraw canvas ── */}
      <div className="flex-1 relative overflow-hidden">
        <Tldraw
          store={store}
          licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
          forceMobile={false}
          className="w-full h-full"
          // forceDarkMode tells tldraw to use its built-in dark theme
          // rather than relying on prefers-color-scheme
          forceDarkMode
        />
      </div>
    </div>
  );
}
