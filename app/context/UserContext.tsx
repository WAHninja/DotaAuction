'use client';

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';

type User = {
  id: number;
  username: string;
} | null;

type UserContextType = {
  user: User;
  refreshUser: () => Promise<void>;
  loading: boolean;
};

export const UserContext = createContext<UserContextType>({
  user: null,
  refreshUser: async () => {},
  loading: true,
});

export default function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/me', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 Runs on first load AND after router.replace('/')
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        refreshUser,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
