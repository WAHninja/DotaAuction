'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';
import Link from 'next/link';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import supabaseClient from '@/lib/supabase-client';

const ExcalidrawComponent = dynamic(
  async () => {
    const { Excalidraw } = await import('@excalidraw/excalidraw');
    return Excalidraw;
  },
  {
    ssr: false,
    loading: () => <div style={{ height: 'calc(100vh - 52px)' }} className="w-full bg-[#121212]" />,
  }
);

const DEBOUNCE_MS = 400;

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
      {status === 'offline'
        ? <WifiOff className="w-3 h-3" />
        : <Wifi    className="w-3 h-3" />
      }
      {status === 'online' ? 'Live' : status === 'connecting' ? 'Connecting…' : 'Offline'}
    </span>
  );
}

export default function WhiteboardClient({ roomId, username, userId }: Props) {
  const [connStatus, setConnStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  const apiRef        = useRef<any>(null);
  const channelRef    = useRef<any>(null);
  const isRemote      = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabaseClient) {
      setConnStatus('offline');
      return;
    }

    const channel = supabaseClient
      .channel(`whiteboard-${roomId}`)
      .on('broadcast', { event: 'scene' }, ({ payload }) => {
        if (payload.senderId === userId) return;
        if (!apiRef.current) return;
        isRemote.current = true;
        apiRef.current.updateScene({ elements: payload.elements });
        setTimeout(() => { isRemote.current = false; }, 0);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED')         setConnStatus('online');
        else if (status === 'CHANNEL_ERROR') setConnStatus('offline');
        else                                 setConnStatus('connecting');
      });

    channelRef.current = channel;

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabaseClient!.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, userId]);

  const handleChange = useCallback(
    (elements: readonly any[]) => {
      if (isRemote.current) return;
      if (!channelRef.current) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        channelRef.current?.send({
          type:    'broadcast',
          event:   'scene',
          payload: { senderId: userId, elements },
        });
      }, DEBOUNCE_MS);
    },
    [userId]
  );

  return (
    <>
      {/* ── Toolbar ── */}
      <div
        className="
          fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-4
          px-4 py-2.5
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

      {/* ── Excalidraw canvas — sits below the 52px toolbar ── */}
      <div
        className="fixed inset-x-0 bottom-0"
        style={{ top: 52, height: 'calc(100vh - 52px)' }}
      >
        <ExcalidrawComponent
          excalidrawAPI={(api: any) => { apiRef.current = api; }}
          onChange={handleChange}
          theme="dark"
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
            },
          }}
        />
      </div>
    </>
  );
}
