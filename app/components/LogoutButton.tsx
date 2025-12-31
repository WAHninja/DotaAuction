'use client';

import { useRouter } from 'next/navigation';
import { useState, useContext } from 'react';
import { UserContext } from '@/app/context/UserContext'; // your global user context

export default function LogoutButton() {
  const router = useRouter();
  const { setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    // Optimistically clear user from UI
    setUser(null);

    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Logout failed');
      }

      // Redirect after logout
      router.push('/login');
    } catch (error) {
      console.error(error);
      alert('Failed to logout. Please try again.');
      // Rollback user state if logout failed
      setUser({ username: 'Unknown' }); // or fetch current user again
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
