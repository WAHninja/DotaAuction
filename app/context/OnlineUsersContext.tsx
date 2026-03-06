'use client';

// app/context/OnlineUsersContext.tsx
//
// Tracks which users are online across the entire app — not just the dashboard.
//
// Previously, useOnlineUsers() was called directly inside CreateMatchForm,
// which meant presence was only tracked while that component was mounted
// (i.e. only on the dashboard). Moving the hook here means every page
// participates in the shared "online-users" Supabase channel: a user browsing
// the match page or their profile page still shows as online to everyone else.
//
// Architecture:
//   OnlineUsersProvider sits inside UserProvider in layout.tsx so it can
//   read the current user's ID from UserContext without prop-drilling.
//   Components that need the online set import useContext(OnlineUsersContext).

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useOnlineUsers } from '@/app/hooks/useOnlineUsers';
import { UserContext } from '@/app/context/UserContext';

export const OnlineUsersContext = createContext<Set<number>>(new Set());

export function OnlineUsersProvider({ children }: { children: ReactNode }) {
  const { user } = useContext(UserContext);
  // Passes null when logged out — useOnlineUsers no-ops in that case.
  const onlineIds = useOnlineUsers(user?.id ?? null);

  return (
    <OnlineUsersContext.Provider value={onlineIds}>
      {children}
    </OnlineUsersContext.Provider>
  );
}
