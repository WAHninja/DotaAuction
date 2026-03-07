'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Room naming
// ---------------------------------------------------------------------------

// The main persistent lobby — all users land here when they join voice chat.
// Sufficiently unique to avoid collisions on meet.jit.si's public server.
export const MAIN_ROOM = 'DotA-Auctions-Main-Lobby-v2';

// Loser's lounge is per-game so that moving back/forward between games works
// correctly even if users are still connected from a previous game.
export function getLoserRoom(gameId: number): string {
  return `DotA-Auctions-Losers-Game-${gameId}`;
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

type JitsiContextType = {
  hasJoined:  boolean;
  isMinimized: boolean;
  currentRoom: string;
  joinChat:    () => void;
  leaveChat:   () => void;
  switchRoom:  (room: string) => void;
  toggleMinimize: () => void;
};

export const JitsiContext = createContext<JitsiContextType>({
  hasJoined:  false,
  isMinimized: false,
  currentRoom: MAIN_ROOM,
  joinChat:    () => {},
  leaveChat:   () => {},
  switchRoom:  () => {},
  toggleMinimize: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function JitsiProvider({ children }: { children: ReactNode }) {
  const [hasJoined,   setHasJoined]   = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(MAIN_ROOM);

  const joinChat = useCallback(() => {
    setHasJoined(true);
    setCurrentRoom(MAIN_ROOM);
    setIsMinimized(false);
  }, []);

  const leaveChat = useCallback(() => {
    setHasJoined(false);
    setCurrentRoom(MAIN_ROOM);
  }, []);

  const switchRoom = useCallback((room: string) => {
    setCurrentRoom(room);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(v => !v);
  }, []);

  return (
    <JitsiContext.Provider value={{
      hasJoined,
      isMinimized,
      currentRoom,
      joinChat,
      leaveChat,
      switchRoom,
      toggleMinimize,
    }}>
      {children}
    </JitsiContext.Provider>
  );
}

export function useJitsi() {
  return useContext(JitsiContext);
}
