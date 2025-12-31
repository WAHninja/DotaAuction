'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';

export type User = {
  username: string;
} | null;

export type UserContextType = {
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me', {
          headers: { Accept: 'application/json' },
          cache: 'no-store', // always get latest user data
        });

        if (!res.ok) {
          console.error('Failed to fetch user:', res.statusText);
          return;
        }

        const data = await res.json();
        setUser(data.user ?? null);
      } catch (err) {
        console.error('Error fetching user:', err);
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
