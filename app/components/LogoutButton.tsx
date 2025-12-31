'use client';

import { useRouter } from 'next/navigation';
import { useState, useContext } from 'react';
import { UserContext } from '@/app/context/UserContext';

export default function LogoutButton() {
  const router = useRouter();
  const { setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    setUser(null); // Optimistic update

    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Logout failed');
      router.push('/login');
    } catch (error) {
      console.error(error);
      alert('Failed to logout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`px-4 py-2 rounded text-white ${
        loading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
      }`}
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
