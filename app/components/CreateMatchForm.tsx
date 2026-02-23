'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useOnlineUsers } from '@/app/hooks/useOnlineUsers';

interface Player {
  id: number;
  username: string;
}

type CreateMatchFormProps = {
  currentUserId: number;
};

export default function CreateMatchForm({ currentUserId }: CreateMatchFormProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const onlineIds = useOnlineUsers(currentUserId);

  useEffect(() => {
    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        setPlayers(Array.isArray(data.players) ? data.players : []);
      })
      .catch(err => console.error('Failed to load players:', err));
  }, []);

  const togglePlayer = (id: number) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedPlayerIds.length < 4) {
      setError('Please select at least 4 players.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: selectedPlayerIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create or rejoin match.');
        return;
      }

      router.push(`/match/${data.id}`);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enoughSelected = selectedPlayerIds.length >= 4;

  // Players with the site open, excluding the current user (you're always "online")
  const onlineOthers = players.filter(p => onlineIds.has(p.id) && p.id !== currentUserId);

  return (
    <form onSubmit={handleSubmit} className="panel h-full flex flex-col p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-1">
        <h2 className="font-cinzel text-3xl font-bold text-dota-gold">
          Select Players
        </h2>
        <div className="divider-gold" />
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="font-barlow text-sm text-dota-dire-light bg-dota-dire-subtle border border-dota-dire-border rounded px-4 py-2.5">
          {error}
        </div>
      )}

      {/* ── Subheading + online count ───────────────────────────────────────── */}
      <div className="text-center space-y-1.5">
        <p className="font-barlow text-sm text-dota-text-muted">
          Select <span className="text-dota-text font-semibold">4 or more players</span> to start or continue a match
        </p>
        {/* Only shown once at least one other player is online */}
        {onlineOthers.length > 0 && (
          <p className="font-barlow text-xs text-dota-text-dim flex items-center justify-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-dota-radiant shrink-0" />
            {onlineOthers.length === 1
              ? `${onlineOthers[0].username} is online`
              : `${onlineOthers.length} players online`
            }
          </p>
        )}
      </div>

      {/* ── Player grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto pr-1 flex-1">
        {players.map(player => {
          const selected = selectedPlayerIds.includes(player.id);
          const isOnline = onlineIds.has(player.id);
          const isYou    = player.id === currentUserId;

          return (
            <label
              key={player.id}
              className={`
                cursor-pointer px-3 py-2.5 rounded border text-center font-barlow font-semibold
                text-sm tracking-wide transition-all select-none relative
                ${selected
                  ? 'bg-dota-overlay border-dota-gold text-dota-gold shadow-gold'
                  : 'bg-dota-deep border-dota-border text-dota-text-muted hover:border-dota-border-bright hover:text-dota-text'
                }
              `}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => togglePlayer(player.id)}
                className="hidden"
              />

              {/* ── Online presence dot ──────────────────────────────────── */}
              {isOnline && (
                <span
                  aria-label={isYou ? 'You are online' : `${player.username} is online`}
                  className={`
                    absolute top-1.5 right-1.5
                    w-2 h-2 rounded-full
                    ring-2
                    ${selected ? 'ring-dota-overlay' : 'ring-dota-deep'}
                    ${isYou ? 'bg-dota-gold' : 'bg-dota-radiant'}
                  `}
                />
              )}

              {player.username}
            </label>
          );
        })}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 font-barlow text-xs text-dota-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-dota-radiant shrink-0" />
          Online
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-dota-gold shrink-0" />
          You
        </span>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <p className="stat-label">
          {selectedPlayerIds.length} selected
          {!enoughSelected && (
            <span className="text-dota-text-dim normal-case font-normal">
              {' '}· need {4 - selectedPlayerIds.length} more
            </span>
          )}
        </p>

        <button
          type="submit"
          disabled={!enoughSelected || isSubmitting}
          className="btn-primary min-w-[160px]"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Creating…' : 'Play'}
        </button>
      </div>

    </form>
  );
}
