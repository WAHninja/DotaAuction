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

// ---------------------------------------------------------------------------
// Room naming
// ---------------------------------------------------------------------------

export const MAIN_ROOM = 'DotA-Auctions-Main-Lobby-v2';

export function getLoserRoom(gameId: number): string {
  return `DotA-Auctions-Losers-Game-${gameId}`;
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export type RoomNotification = {
  targetRoom:  string;
  countdown:   number;   // seconds remaining
  isLoserRoom: boolean;
};

type JitsiContextType = {
  hasJoined:        boolean;
  isMinimized:      boolean;
  currentRoom:      string;
  notification:     RoomNotification | null;
  joinChat:         () => void;
  leaveChat:        () => void;
  switchRoom:       (room: string) => void;
  toggleMinimize:   () => void;
  dismissNotification: () => void;
};

export const JitsiContext = createContext<JitsiContextType>({
  hasJoined:        false,
  isMinimized:      false,
  currentRoom:      MAIN_ROOM,
  notification:     null,
  joinChat:         () => {},
  leaveChat:        () => {},
  switchRoom:       () => {},
  toggleMinimize:   () => {},
  dismissNotification: () => {},
});

const COUNTDOWN_SECS = 5;

// ---------------------------------------------------------------------------
// Audio notification — two-tone beep via Web Audio API (no file needed)
// ---------------------------------------------------------------------------

function playRoomSwitchBeep(isLoserRoom: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new AudioContext();
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
  const [notification, setNotification] = useState<RoomNotification | null>(null);

  // Hold the pending target so the interval can read it without stale closure
  const pendingRoomRef  = useRef<string | null>(null);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up any running countdown
  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    pendingRoomRef.current = null;
    setNotification(null);
  }, []);

  const joinChat = useCallback(() => {
    clearCountdown();
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
    // No-op if already in that room or a countdown to that room is running
    setCurrentRoom(prev => {
      if (prev === room) return prev;

      // Cancel any previous countdown that hasn't fired yet
      if (intervalRef.current) clearInterval(intervalRef.current);
      pendingRoomRef.current = room;

      const isLoserRoom = room !== MAIN_ROOM;
      let remaining = COUNTDOWN_SECS;

      setNotification({ targetRoom: room, countdown: remaining, isLoserRoom });
      playRoomSwitchBeep(isLoserRoom);

      intervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setNotification(null);
          // Actually perform the switch
          setCurrentRoom(pendingRoomRef.current ?? room);
          pendingRoomRef.current = null;
        } else {
          setNotification(n =>
            n ? { ...n, countdown: remaining } : null
          );
        }
      }, 1000);

      return prev; // don't change room yet — wait for countdown
    });
  }, []);

  const dismissNotification = useCallback(() => {
    clearCountdown();
  }, [clearCountdown]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(v => !v);
  }, []);

  // Clean up on unmount
  useEffect(() => () => clearCountdown(), [clearCountdown]);

  return (
    <JitsiContext.Provider value={{
      hasJoined,
      isMinimized,
      currentRoom,
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
