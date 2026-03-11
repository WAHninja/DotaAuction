'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadJitsiScript, getJaasToken } from '@/app/components/ChatWidget';

// ---------------------------------------------------------------------------
// Room naming
// ---------------------------------------------------------------------------

export const MAIN_ROOM = 'Main-Lobby';

export function getLoserRoom(gameId: number): string {
  return `Losers-Lounge-Game-${gameId}`;
}

export function getTeam1DraftRoom(gameId: number): string {
  return `Draft-Team1-Game-${gameId}`;
}

export function getTeamADraftRoom(gameId: number): string {
  return `Draft-TeamA-Game-${gameId}`;
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export type RoomNotification = {
  targetRoom:  string;
  countdown:   number;
  isLoserRoom: boolean;
  isDraftRoom: boolean;
};

export type RoomType = 'main' | 'loser' | 'draft';

export function getRoomType(room: string): RoomType {
  if (room === MAIN_ROOM)     return 'main';
  if (room.includes('Draft')) return 'draft';
  return 'loser';
}

type JitsiContextType = {
  hasJoined:           boolean;
  isMinimized:         boolean;
  currentRoom:         string;
  pendingRoom:         string | null;
  notification:        RoomNotification | null;
  joinChat:            () => void;
  leaveChat:           () => void;
  switchRoom:          (room: string) => void;
  toggleMinimize:      () => void;
  dismissNotification: () => void;
};

export const JitsiContext = createContext<JitsiContextType>({
  hasJoined:           false,
  isMinimized:         false,
  currentRoom:         MAIN_ROOM,
  pendingRoom:         null,
  notification:        null,
  joinChat:            () => {},
  leaveChat:           () => {},
  switchRoom:          () => {},
  toggleMinimize:      () => {},
  dismissNotification: () => {},
});

export const COUNTDOWN_SECS = 5;

// ---------------------------------------------------------------------------
// Audio notification — two-tone beep via Web Audio API (no file needed)
// ---------------------------------------------------------------------------

function playRoomSwitchBeep(isLoserRoom: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const ctx   = new AudioContext();
    const tones = isLoserRoom ? [880, 660] : [660, 880];
    tones.forEach((freq, i) => {
      const osc     = ctx.createOscillator();
      const gain    = ctx.createGain();
      const startAt = ctx.currentTime + i * 0.18;
      osc.type      = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.35, startAt + 0.02);
      gain.gain.linearRampToValueAtTime(0,    startAt + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.15);
    });
    setTimeout(() => ctx.close(), 600);
  } catch { /* AudioContext not available */ }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function JitsiProvider({ children }: { children: ReactNode }) {
  const [hasJoined,    setHasJoined]    = useState(false);
  const [isMinimized,  setIsMinimized]  = useState(false);
  const [currentRoom,  setCurrentRoom]  = useState(MAIN_ROOM);
  const [pendingRoom,  setPendingRoom]  = useState<string | null>(null);
  const [notification, setNotification] = useState<RoomNotification | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPendingRoom(null);
    setNotification(null);
  }, []);

  const joinChat = useCallback(() => {
    clearCountdown();
    // Pre-warm before the join effect fires — both calls are idempotent.
    // loadJitsiScript uses a module-level promise so repeated calls are free.
    // getJaasToken populates the cache so createJitsiInstance skips the fetch.
    loadJitsiScript().catch(() => {});
    getJaasToken(MAIN_ROOM).catch(() => {});
    setHasJoined(true);
    setCurrentRoom(MAIN_ROOM);
    setIsMinimized(false);
  }, [clearCountdown]);

  const leaveChat = useCallback(() => {
    clearCountdown();
    setHasJoined(false);
    setCurrentRoom(MAIN_ROOM);
  }, [clearCountdown]);

  const switchRoom = useCallback((room: string) => {
    setCurrentRoom(prev => {
      if (prev === room) return prev;

      if (intervalRef.current) clearInterval(intervalRef.current);

      const roomType    = getRoomType(room);
      const isLoserRoom = roomType === 'loser';
      const isDraftRoom = roomType === 'draft';
      let remaining     = COUNTDOWN_SECS;

      // Signal ChatWidget to start pre-connecting immediately
      setPendingRoom(room);
      setNotification({ targetRoom: room, countdown: remaining, isLoserRoom, isDraftRoom });
      playRoomSwitchBeep(isLoserRoom);

      intervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setNotification(null);
          // Promote pending → current; ChatWidget swaps visibility
          setCurrentRoom(room);
          setPendingRoom(null);
        } else {
          playRoomSwitchBeep(isLoserRoom);
          setNotification(n => n ? { ...n, countdown: remaining } : null);
        }
      }, 1000);

      return prev; // don't change currentRoom yet — wait for countdown
    });
  }, []);

  const dismissNotification = useCallback(() => {
    clearCountdown();
  }, [clearCountdown]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(v => !v);
  }, []);

  useEffect(() => () => clearCountdown(), [clearCountdown]);

  return (
    <JitsiContext.Provider value={{
      hasJoined,
      isMinimized,
      currentRoom,
      pendingRoom,
      notification,
      joinChat,
      leaveChat,
      switchRoom,
      toggleMinimize,
      dismissNotification,
    }}>
      {children}
    </JitsiContext.Provider>
  );
}

export function useJitsi() {
  return useContext(JitsiContext);
}
