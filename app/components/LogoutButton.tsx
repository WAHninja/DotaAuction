'use client';
// app/components/LogoutButton.tsx
//
// Changes from original:
//
//   • Loader2 spinner while signing out — consistent with every other loading
//     state in the app (which all use Loader2 animate-spin).
//
//   • `className` prop — callers can override styles. The mobile drawer uses
//     this to make the button full-width and match the drawer's link style,
//     rather than the compact inline button the desktop nav uses.
//
//   • `showConfirm` prop — adds a two-step "Sign out → Are you sure? →
//     Confirm" flow. Pass this on touch surfaces (the mobile drawer) where
//     accidental taps are more likely. On desktop the button has a visual
//     divider separating it from navigation links, which is sufficient.
//
//   • Calls refreshUser() after logout so UserContext is cleared immediately,
//     preventing nav items from persisting on the /login page.
import { useCallback, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';

type LogoutButtonProps = {
  className?: string;
  showConfirm?: boolean;
};

export default function LogoutButton({
  className,
  showConfirm = false,
}: LogoutButtonProps) {
  const [loading,    setLoading]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const { refreshUser } = useContext(UserContext);

  const handleLogout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/api/logout', { method: 'POST' });
      await refreshUser();       // clears user in context before navigation
      router.push('/login');
    } catch {
      setLoading(false);
    }
  }, [router, refreshUser]);

  const handleClick = useCallback(() => {
    if (loading) return;
    if (showConfirm && !confirming) {
      setConfirming(true);
      return;
    }
    handleLogout();
  }, [loading, showConfirm, confirming, handleLogout]);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(false);
  }, []);

  // Default desktop style — compact, inline with nav links.
  // Pass className to override for the mobile drawer.
  const baseClass =
    className ??
    'btn-ghost text-sm flex items-center gap-1.5';

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleClick}
          disabled={loading}
          className={baseClass}
          aria-label="Confirm sign out"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            : null}
          {loading ? 'Signing out…' : 'Confirm?'}
        </button>
        <button
          onClick={handleCancel}
          className="text-xs font-barlow text-dota-text-muted hover:text-dota-text transition-colors"
          aria-label="Cancel sign out"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={baseClass}
      aria-label="Sign out"
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        : <LogOut  className="w-4 h-4"              aria-hidden="true" />}
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
