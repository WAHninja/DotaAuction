// app/context/UserContext.tsx
'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';

type User = {
  username: string;
} | null;

type UserContextType = {
  user: User;
  setUser: (user: User) => void;
};

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
});

type Props = {
  children: ReactNode;
};

export default function UserProvider({ children }: Props) {
  const [user, setUser] = useState<User>(null);

  // Optionally fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me', { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user ?? null);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
