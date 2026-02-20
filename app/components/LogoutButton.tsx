'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';

export default function LogoutButton() {
  const router = useRouter();
  const { refreshUser } = useContext(UserContext);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
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
      className="btn-ghost text-sm flex items-center gap-1.5"
    >
      <LogOut className="w-3.5 h-3.5" />
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
