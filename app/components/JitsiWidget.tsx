'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Minimize2, Maximize2, PhoneOff, Phone,
  Lock, Users,
} from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import { useJitsi, MAIN_ROOM } from '@/app/context/JitsiContext';

// ---------------------------------------------------------------------------
// Jitsi External API type stub
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>
    ) => JitsiAPI;
  }
}

interface JitsiAPI {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addEventListeners: (listeners: Record<string, (e?: unknown) => void>) => void;
}

// ---------------------------------------------------------------------------
// Script loader — loads the Jitsi External API once
// ---------------------------------------------------------------------------

let scriptPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; reject(new Error('Failed to load Jitsi script')); };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ---------------------------------------------------------------------------
// Join button — shown before the user enters voice chat
// ---------------------------------------------------------------------------

function JoinButton({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={onJoin}
        className="
          group flex items-center gap-2.5
          px-4 py-3 rounded-xl
          bg-dota-surface border border-dota-border
          hover:border-dota-gold/60 hover:bg-dota-overlay
          transition-all duration-200
          shadow-raised
          font-barlow font-semibold text-sm text-dota-text-muted
          hover:text-dota-gold
        "
        aria-label="Join voice chat"
      >
        <Phone className="w-4 h-4 group-hover:text-dota-gold transition-colors" />
        Voice Chat
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

const WIDGET_W = 340;
const WIDGET_H = 280;

export default function JitsiWidget() {
  const { user } = useContext(UserContext);
  const { hasJoined, isMinimized, currentRoom, joinChat, leaveChat, toggleMinimize } = useJitsi();

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef       = useRef<JitsiAPI | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const isLosersRoom = currentRoom !== MAIN_ROOM;

  // ---- Initialise / switch rooms ----------------------------------------
  useEffect(() => {
    if (!hasJoined || !user) return;

    let mounted = true;

    async function init() {
      // Tear down any existing session
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* ignore */ }
        apiRef.current = null;
      }

      // Clear any previous iframe content
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      setConnecting(true);
      setError(null);

      try {
        await loadJitsiScript();
        if (!mounted || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: currentRoom,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: user.username },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithVideoMuted: true,
            startWithAudioMuted: false,
            disableDeepLinking: true,
            enableNoisyMicDetection: false,
            toolbarButtons: [
              'microphone', 'hangup', 'tileview', 'participants-pane',
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            TOOLBAR_ALWAYS_VISIBLE: false,
          },
        });

        apiRef.current = api;

        api.addEventListeners({
          videoConferenceJoined: () => { if (mounted) setConnecting(false); },
          videoConferenceLeft:   () => { if (mounted) leaveChat(); },
          errorOccurred:        () => { if (mounted) setError('Connection error. Try leaving and rejoining.'); setConnecting(false); },
        });
      } catch (err) {
        if (mounted) {
          setError('Failed to start voice chat. Check your connection and try again.');
          setConnecting(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasJoined, currentRoom, user?.id]);

  // ---- Dispose on leave --------------------------------------------------
  useEffect(() => {
    if (!hasJoined && apiRef.current) {
      try { apiRef.current.dispose(); } catch { /* ignore */ }
      apiRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    }
  }, [hasJoined]);

  // ---- Dispose on unmount ------------------------------------------------
  useEffect(() => {
    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* ignore */ }
      }
    };
  }, []);

  if (!user) return null;
  if (!hasJoined) return <JoinButton onJoin={joinChat} />;

  const roomLabel = isLosersRoom ? "Loser's Lounge" : 'Main Chat';
  const headerBg  = isLosersRoom
    ? 'bg-dota-dire/20 border-dota-dire-border'
    : 'bg-dota-gold/10 border-dota-gold/30';
  const headerText = isLosersRoom ? 'text-dota-dire-light' : 'text-dota-gold';

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex flex-col rounded-xl overflow-hidden shadow-raised border border-dota-border"
      style={{ width: WIDGET_W }}
      aria-label="Voice chat"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${headerBg} gap-2`}>
        <div className={`flex items-center gap-2 font-barlow font-semibold text-xs tracking-wide ${headerText}`}>
          {isLosersRoom
            ? <Lock className="w-3 h-3 shrink-0" />
            : <Users className="w-3 h-3 shrink-0" />
          }
          <span>{roomLabel}</span>
          {connecting && (
            <span className="text-dota-text-dim font-normal animate-pulse">Connecting…</span>
          )}
          {isLosersRoom && !connecting && (
            <span className="text-dota-dire-light/60 font-normal text-[10px]">
              Waiting for auction…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleMinimize}
            className="p-1 rounded text-dota-text-dim hover:text-dota-text transition-colors"
            aria-label={isMinimized ? 'Expand voice chat' : 'Minimise voice chat'}
          >
            {isMinimized
              ? <Maximize2 className="w-3.5 h-3.5" />
              : <Minimize2 className="w-3.5 h-3.5" />
            }
          </button>
          <button
            onClick={leaveChat}
            className="p-1 rounded text-dota-dire-light/70 hover:text-dota-dire-light transition-colors"
            aria-label="Leave voice chat"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Jitsi iframe container — always mounted, hidden when minimised ─ */}
      <div
        style={{
          height: isMinimized ? 0 : WIDGET_H,
          display: isMinimized ? 'none' : 'block',
          background: '#111827',
          position: 'relative',
        }}
      >
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
            <MicOff className="w-6 h-6 text-dota-dire-light" />
            <p className="font-barlow text-xs text-dota-text-muted">{error}</p>
            <button
              onClick={leaveChat}
              className="btn-ghost text-xs px-3 py-1.5"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
