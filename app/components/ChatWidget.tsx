'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import {
  Minimize2, Maximize2, PhoneOff, Phone,
  Lock, Users, MicOff, AlertTriangle,
} from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import { useJitsi, MAIN_ROOM } from '@/app/context/JitsiContext';

// ---------------------------------------------------------------------------
// JaaS config
// ---------------------------------------------------------------------------
const JAAS_APP_ID = process.env.NEXT_PUBLIC_JAAS_APP_ID!;
const JAAS_DOMAIN = '8x8.vc';

// ---------------------------------------------------------------------------
// Load the Jitsi External API script once
// ---------------------------------------------------------------------------

let scriptPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).JitsiMeetExternalAPI) return resolve();
    const script = document.createElement('script');
    script.src = `https://${JAAS_DOMAIN}/libs/external_api.min.js`;
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load Jitsi script'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// ---------------------------------------------------------------------------
// Join button
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
// Room-switch notification toast
// ---------------------------------------------------------------------------

function RoomNotificationToast() {
  const { notification, dismissNotification } = useJitsi();
  if (!notification) return null;

  const { countdown, isLoserRoom } = notification;
  const destination = isLoserRoom ? "Loser's Lounge" : 'Main Chat';
  const bgClass     = isLoserRoom
    ? 'bg-dota-dire/90 border-dota-dire-border text-dota-dire-light'
    : 'bg-dota-gold/20 border-dota-gold/50 text-dota-gold';

  return (
    <div
      className={`
        fixed bottom-24 right-6 z-50
        flex items-start gap-3
        px-4 py-3 rounded-xl
        border shadow-raised
        font-barlow text-sm
        animate-in slide-in-from-right duration-300
        ${bgClass}
      `}
      style={{ maxWidth: 280 }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">
          Moving to {destination}
        </p>
        <p className="text-xs opacity-75 mt-0.5">
          Switching in {countdown}s…
        </p>
      </div>
      <button
        onClick={dismissNotification}
        className="shrink-0 text-xs opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

const WIDGET_W = 340;
const WIDGET_H = 280;

export default function ChatWidget() {
  const { user } = useContext(UserContext);
  const {
    hasJoined, isMinimized, currentRoom,
    joinChat, leaveChat, toggleMinimize,
  } = useJitsi();

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef       = useRef<any>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const isLosersRoom = currentRoom !== MAIN_ROOM;

  // ---- Initialise / switch rooms ----------------------------------------
  useEffect(() => {
    if (!hasJoined || !user) return;

    let mounted = true;

    async function init() {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* ignore */ }
        apiRef.current = null;
      }

      setConnecting(true);
      setError(null);

      try {
        const [, tokenRes] = await Promise.all([
          loadJitsiScript(),
          fetch(`/api/jaas/token?room=${encodeURIComponent(currentRoom)}`),
        ]);

        if (!tokenRes.ok) throw new Error('Failed to get meeting token');
        const { token } = await tokenRes.json();

        if (!mounted || !containerRef.current) return;

        const api = new (window as any).JitsiMeetExternalAPI(JAAS_DOMAIN, {
          roomName:   `${JAAS_APP_ID}/${currentRoom}`,
          jwt:        token,
          parentNode: containerRef.current,
          width:      '100%',
          height:     '100%',
          configOverwrite: {
            // Audio-only — disable video entirely
            startWithAudioMuted:     false,
            startWithVideoMuted:     true,
            disableVideoMute:        true,   // hides the mute button so user can't re-enable
            disableFilmstripAutohide: true,
            disableDeepLinking:      true,
            prejoinPageEnabled:      false,
            prejoinConfig:           { enabled: false },
            // Prevent camera from being started at all
            constraints: {
              video: false,
            },
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK:      false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            // No camera button in toolbar
            TOOLBAR_BUTTONS: [
              'microphone', 'hangup', 'tileview', 'settings',
            ],
            SETTINGS_SECTIONS: ['devices'],
            DEFAULT_BACKGROUND: '#111827',
            MOBILE_APP_PROMO:   false,
          },
        });

        api.addEventListener('videoConferenceJoined', () => {
          if (!mounted) return;
          setConnecting(false);
          // Ensure video stays off and can't be turned on
          try { api.executeCommand('stopVideo'); } catch { /* ignore */ }
        });

        api.addEventListener('readyToClose', () => {
          if (mounted) leaveChat();
        });

        api.addEventListener('errorOccurred', () => {
          if (mounted) {
            setError('Connection error. Try leaving and rejoining.');
            setConnecting(false);
          }
        });

        apiRef.current = api;

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

  // ---- Dispose when user leaves ----------------------------------------
  useEffect(() => {
    if (!hasJoined && apiRef.current) {
      try { apiRef.current.dispose(); } catch { /* ignore */ }
      apiRef.current = null;
    }
  }, [hasJoined]);

  // ---- Dispose on unmount -----------------------------------------------
  useEffect(() => {
    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* ignore */ }
      }
    };
  }, []);

  if (!user) return null;
  if (!hasJoined) return (
    <>
      <RoomNotificationToast />
      <JoinButton onJoin={joinChat} />
    </>
  );

  const roomLabel  = isLosersRoom ? "Loser's Lounge" : 'Main Chat';
  const headerBg   = isLosersRoom
    ? 'bg-dota-dire/20 border-dota-dire-border'
    : 'bg-dota-gold/10 border-dota-gold/30';
  const headerText = isLosersRoom ? 'text-dota-dire-light' : 'text-dota-gold';

  return (
    <>
      <RoomNotificationToast />

      <div
        className="fixed bottom-6 right-6 z-40 flex flex-col rounded-xl overflow-hidden shadow-raised border border-dota-border"
        style={{ width: WIDGET_W }}
        aria-label="Voice chat"
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-3 py-2 border-b ${headerBg} gap-2`}>
          <div className={`flex items-center gap-2 font-barlow font-semibold text-xs tracking-wide ${headerText}`}>
            {isLosersRoom
              ? <Lock  className="w-3 h-3 shrink-0" />
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

        {/* ── Jitsi container ──────────────────────────────────────────── */}
        <div
          style={{
            height:   isMinimized ? 0 : WIDGET_H,
            display:  isMinimized ? 'none' : 'block',
            background: '#111827',
            position: 'relative',
          }}
        >
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center z-10">
              <MicOff className="w-6 h-6 text-dota-dire-light" />
              <p className="font-barlow text-xs text-dota-text-muted">{error}</p>
              <button
                onClick={leaveChat}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                Dismiss
              </button>
            </div>
          )}
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </>
  );
}
