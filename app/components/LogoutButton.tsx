'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { UserContext } from '@/app/context/UserContext';

export default function LogoutButton() {
  const router = useRouter();
  const { refreshUser } = useContext(UserContext);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // 🔥 Re-sync auth state after cookie is cleared
      await refreshUser();

      router.replace('/login');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 rounded bg-red-600 hover:bg-red-700
                 text-white font-semibold transition
                 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? 'Logging out…' : 'Logout'}
    </button>
  );
}
