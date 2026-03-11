'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import {
  Minimize2, Maximize2, PhoneOff, Phone,
  Lock, Users, MicOff, AlertTriangle, Swords
} from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import { useJitsi, MAIN_ROOM, COUNTDOWN_SECS, getRoomType } from '@/app/context/JitsiContext';

// ---------------------------------------------------------------------------
// JaaS config
// ---------------------------------------------------------------------------
const JAAS_APP_ID = process.env.NEXT_PUBLIC_JAAS_APP_ID!;
const JAAS_DOMAIN = '8x8.vc';

// ---------------------------------------------------------------------------
// Load the Jitsi External API script once
// ---------------------------------------------------------------------------

let scriptPromise: Promise<void> | null = null;

export function loadJitsiScript(): Promise<void> {
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
// Token cache — module-level, persists for the session
// Token grants room: '*' so it's valid for any room switch.
// TTL is 7200s per /api/jaas/token; we expire 5 min early to avoid edges.
// ---------------------------------------------------------------------------

type CachedToken = { token: string; expiresAt: number };
let tokenCache: CachedToken | null = null;

export async function getJaasToken(room: string): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 300_000 > now) {
    return tokenCache.token;
  }
  const res = await fetch(`/api/jaas/token?room=${encodeURIComponent(room)}`);
  if (!res.ok) throw new Error('Failed to get meeting token');
  const { token } = await res.json();
  tokenCache = { token, expiresAt: now + 7_200_000 };
  return token;
}

// ---------------------------------------------------------------------------
// Shared Jitsi config (audio-only)
// ---------------------------------------------------------------------------

function jitsiConfig() {
  return {
    configOverwrite: {
      startWithAudioMuted:      false,
      startWithVideoMuted:      true,
      disableVideoMute:         true,
      disableFilmstripAutohide: true,
      disableDeepLinking:       true,
      prejoinPageEnabled:       false,
      prejoinConfig:            { enabled: false },
      constraints:              { video: false },
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK:      false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      TOOLBAR_BUTTONS:           ['microphone', 'hangup', 'tileview', 'settings'],
      SETTINGS_SECTIONS:         ['devices'],
      DEFAULT_BACKGROUND:        '#111827',
      MOBILE_APP_PROMO:          false,
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: spin up a Jitsi instance into a given DOM node
// ---------------------------------------------------------------------------

async function createJitsiInstance(
  room: string,
  node: HTMLDivElement,
  onJoined: () => void,
  onClose:  () => void,
  onError:  () => void,
): Promise<any> {
  await loadJitsiScript();
  const token = await getJaasToken(room);

  const api = new (window as any).JitsiMeetExternalAPI(JAAS_DOMAIN, {
    roomName:   `${JAAS_APP_ID}/${room}`,
    jwt:        token,
    parentNode: node,
    width:      '100%',
    height:     '100%',
    ...jitsiConfig(),
  });

  api.addEventListener('videoConferenceJoined', () => {
    try { api.executeCommand('stopVideo'); } catch { /* ignore */ }
    onJoined();
  });
  api.addEventListener('readyToClose', onClose);
  api.addEventListener('errorOccurred', onError);

  return api;
}

// ---------------------------------------------------------------------------
// Join button
// Pre-warms both the Jitsi script and token cache on click, before the join
// effect fires, so the first createJitsiInstance call has less work to do.
// ---------------------------------------------------------------------------

function JoinButton({ onJoin }: { onJoin: () => void }) {
  function handleClick() {
    // Fire-and-forget — both are idempotent and safe to call multiple times.
    // By the time the join effect fires after setState, these may already
    // be resolved (script loaded, token cached).
    loadJitsiScript().catch(() => {});
    getJaasToken(MAIN_ROOM).catch(() => {});
    onJoin();
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={handleClick}
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
        Join Voice Chat
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

  const { countdown, isLoserRoom, isDraftRoom } = notification;
  const destination = isLoserRoom ? "Loser's Lounge"
                    : isDraftRoom ? 'Team Draft Channel'
                    :               'Main Chat';
  const progress    = (countdown / COUNTDOWN_SECS) * 100;

  const bg         = isLoserRoom ? '#3d0f0f' : isDraftRoom ? '#0f1f3d' : '#1a1508';
  const border     = isLoserRoom ? '#7f1d1d' : isDraftRoom ? '#1d3a7f' : '#92400e';
  const titleColor = isLoserRoom ? '#fca5a5' : isDraftRoom ? '#93c5fd' : '#fcd34d';
  const barColor   = isLoserRoom ? '#ef4444' : isDraftRoom ? '#3b82f6' : '#f59e0b';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 96,
        right: 24,
        zIndex: 50,
        width: 280,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        fontFamily: 'var(--font-barlow, sans-serif)',
      }}
    >
      {/* Progress bar at top */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: barColor,
            transition: 'width 0.9s linear',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px' }}>
        <AlertTriangle style={{ width: 18, height: 18, color: titleColor, flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: titleColor, lineHeight: 1.3 }}>
            Moving to {destination}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
            Switching in <span style={{ color: titleColor, fontWeight: 600 }}>{countdown}s</span>
          </p>
        </div>
        <button
          onClick={dismissNotification}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 16,
            lineHeight: 1,
            padding: '2px 4px',
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
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
    hasJoined, isMinimized, currentRoom, pendingRoom,
    joinChat, leaveChat, toggleMinimize,
  } = useJitsi();

  // Two containers — active (visible) and pending (hidden, pre-connecting)
  const activeContainerRef  = useRef<HTMLDivElement>(null);
  const pendingContainerRef = useRef<HTMLDivElement>(null);
  const activeApiRef        = useRef<any>(null);
  const pendingApiRef       = useRef<any>(null);

  const [connecting, setConnecting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const roomType = getRoomType(currentRoom);

  // ---- Helper: dispose an api instance safely ----------------------------
  function disposeApi(ref: React.MutableRefObject<any>) {
    if (ref.current) {
      try { ref.current.dispose(); } catch { /* ignore */ }
      ref.current = null;
    }
  }

  // ---- Initial join ------------------------------------------------------
  useEffect(() => {
    if (!hasJoined || !user) return;

    let mounted = true;

    async function init() {
      disposeApi(activeApiRef);
      setConnecting(true);
      setError(null);

      try {
        const api = await createJitsiInstance(
          currentRoom,
          activeContainerRef.current!,
          () => { if (mounted) setConnecting(false); },
          () => { if (mounted) leaveChat(); },
          () => { if (mounted) { setError('Connection error. Try leaving and rejoining.'); setConnecting(false); } },
        );
        if (!mounted) { try { api.dispose(); } catch { /* ignore */ } return; }
        activeApiRef.current = api;
      } catch {
        if (mounted) {
          setError('Failed to start voice chat. Check your connection and try again.');
          setConnecting(false);
        }
      }
    }

    init();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasJoined, user?.id]);

  // ---- Pre-connect to pending room during countdown ----------------------
  useEffect(() => {
    if (!hasJoined || !user || !pendingRoom || !pendingContainerRef.current) return;

    let mounted = true;

    async function preload() {
      disposeApi(pendingApiRef);
      try {
        const api = await createJitsiInstance(
          pendingRoom!,
          pendingContainerRef.current!,
          () => { /* silently connected — wait for swap */ },
          () => { if (mounted) leaveChat(); },
          () => { /* pre-load failed — fallback handles it */ },
        );
        if (!mounted) { try { api.dispose(); } catch { /* ignore */ } return; }
        pendingApiRef.current = api;
      } catch {
        // Pre-load failed — fallback effect below will handle it on swap
      }
    }

    preload();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRoom, hasJoined, user?.id]);

  // ---- Swap: countdown finished, promote pending → active ----------------
  useEffect(() => {
    if (!hasJoined || !user || pendingRoom !== null) return;

    if (pendingApiRef.current) {
      // Pre-loaded instance is ready — promote it instantly
      disposeApi(activeApiRef);
      activeApiRef.current  = pendingApiRef.current;
      pendingApiRef.current = null;

      // Move the pre-built iframe node from pending div into active div
      if (activeContainerRef.current && pendingContainerRef.current) {
        while (pendingContainerRef.current.firstChild) {
          activeContainerRef.current.appendChild(pendingContainerRef.current.firstChild);
        }
      }

      setConnecting(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRoom]);

  // ---- Fallback: if pre-load failed, connect normally after swap ----------
  useEffect(() => {
    if (!hasJoined || !user || pendingRoom !== null) return;
    if (activeApiRef.current) return; // pre-load succeeded, nothing to do

    let mounted = true;

    async function fallback() {
      setConnecting(true);
      setError(null);
      try {
        const api = await createJitsiInstance(
          currentRoom,
          activeContainerRef.current!,
          () => { if (mounted) setConnecting(false); },
          () => { if (mounted) leaveChat(); },
          () => { if (mounted) { setError('Connection error. Try leaving and rejoining.'); setConnecting(false); } },
        );
        if (!mounted) { try { api.dispose(); } catch { /* ignore */ } return; }
        activeApiRef.current = api;
      } catch {
        if (mounted) {
          setError('Failed to start voice chat. Check your connection and try again.');
          setConnecting(false);
        }
      }
    }

    fallback();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom, pendingRoom]);

  // ---- Dispose when user leaves ------------------------------------------
  useEffect(() => {
    if (!hasJoined) {
      disposeApi(activeApiRef);
      disposeApi(pendingApiRef);
    }
  }, [hasJoined]);

  // ---- Dispose on unmount ------------------------------------------------
  useEffect(() => () => {
    disposeApi(activeApiRef);
    disposeApi(pendingApiRef);
  }, []);

  if (!user) return null;
  if (!hasJoined) return (
    <>
      <RoomNotificationToast />
      <JoinButton onJoin={joinChat} />
    </>
  );

  const roomLabel =
    roomType === 'loser' ? "Loser's Lounge"      :
    roomType === 'draft' ? 'Team Draft Channel'   :
                           'Main Chat';
  const headerBg =
    roomType === 'loser' ? 'bg-dota-dire/20 border-dota-dire-border' :
    roomType === 'draft' ? 'bg-dota-info/20 border-dota-info/40'     :
                           'bg-dota-gold/10 border-dota-gold/30';
  const headerText =
    roomType === 'loser' ? 'text-dota-dire-light' :
    roomType === 'draft' ? 'text-dota-info'        :
                           'text-dota-gold';

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
            {roomType === 'draft' && <Swords className="w-3 h-3 shrink-0" />}
            {roomType === 'loser' && <Lock   className="w-3 h-3 shrink-0" />}
            {roomType === 'main'  && <Users  className="w-3 h-3 shrink-0" />}
            <span>{roomLabel}</span>
            {connecting && (
              <span className="text-dota-text-dim font-normal animate-pulse">Connecting…</span>
            )}
            {roomType === 'loser' && !connecting && (
              <span className="text-dota-dire-light/60 font-normal text-[10px]">
                Waiting for auction…
              </span>
            )}
            {roomType === 'draft' && !connecting && (
              <span className="text-dota-info/60 font-normal text-[10px]">
                Draft in progress — private channel
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

        {/* ── Jitsi containers ─────────────────────────────────────────── */}
        <div
          style={{
            height:     isMinimized ? 0 : WIDGET_H,
            display:    isMinimized ? 'none' : 'block',
            background: '#111827',
            position:   'relative',
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

          {/* Active room — always visible */}
          <div ref={activeContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Pending room — hidden while pre-connecting during countdown */}
          <div
            ref={pendingContainerRef}
            style={{
              position:      'absolute',
              width:         '100%',
              height:        '100%',
              top:           0,
              left:          0,
              visibility:    'hidden',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </>
  );
}
