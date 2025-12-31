'use client';

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';

type User = { id: number; username: string } | null;

type UserContextType = {
  user: User;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
};

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  refreshUser: async () => {},
  loading: true,
});

export default function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/me', {
        cache: 'no-store',
        credentials: 'include',
      });

      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}
