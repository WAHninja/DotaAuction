'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
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
