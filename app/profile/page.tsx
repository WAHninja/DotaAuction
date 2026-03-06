'use client';

import { useUser } from '@/app/context/UserContext';
import ChangeUsernameForm from '@/app/components/ChangeUsernameForm';
import LinkSteamButton from '@/app/components/LinkSteamButton';
import PlayerAvatar from '@/app/components/PlayerAvatar';

export default function ProfilePage() {
  const { user, refreshUser } = useUser();

  // No newUsername parameter — the form calls onSuccess after the server
  // confirms the change, and we re-fetch the full user via refreshUser()
  // rather than applying the value locally. This keeps the displayed username
  // in sync with the DB rather than relying on client-side state.
  function handleUsernameSuccess() {
    refreshUser();
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-dota-muted">Loading profile…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen page-container py-12 px-4">
      <div className="max-w-lg mx-auto space-y-8">

        {/* ── Avatar + username ──────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          <PlayerAvatar
            username={user.username}
            steamAvatar={user.steam_avatar}
            size={80}
          />
          <h1 className="font-cinzel text-2xl font-bold text-dota-text">
            {user.username}
          </h1>
        </div>

        {/* ── Change username ────────────────────────────────────────────── */}
        <section className="panel p-6 space-y-4">
          <h2 className="font-cinzel text-lg font-semibold text-dota-text">
            Change username
          </h2>
          <ChangeUsernameForm onSuccess={handleUsernameSuccess} />
        </section>

        {/* ── Steam account ─────────────────────────────────────────────── */}
        <section className="panel p-6 space-y-4">
          <h2 className="font-cinzel text-lg font-semibold text-dota-text">
            Steam account
          </h2>
          <LinkSteamButton />
        </section>

      </div>
    </main>
  );
}
