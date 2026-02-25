'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react';
import { useOnlineUsers } from '@/app/hooks/useOnlineUsers';
import PlayerAvatar from '@/app/components/PlayerAvatar';

interface Player {
  id: number;
  username: string;
  steam_avatar?: string | null;
}

type FetchState = 'loading' | 'error' | 'ready';

type CreateMatchFormProps = {
  currentUserId: number;
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="px-3 py-3 rounded border border-dota-border bg-dota-deep animate-pulse flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-dota-border/60 shrink-0" />
      <div className="h-4 rounded bg-dota-border/60 flex-1" />
    </div>
  );
}

export default function CreateMatchForm({ currentUserId }: CreateMatchFormProps) {
  const [players, setPlayers]                     = useState<Player[]>([]);
  const [fetchState, setFetchState]               = useState<FetchState>('loading');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [error, setError]                         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [showSpinner, setShowSpinner]             = useState(false);
  const spinnerTimer                              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router                                    = useRouter();

  const onlineIds = useOnlineUsers(currentUserId);

  // ── Player fetch ────────────────────────────────────────────────────────────
  const loadPlayers = () => {
    setFetchState('loading');
    fetch('/api/players')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setPlayers(Array.isArray(data.players) ? data.players : []);
        setFetchState('ready');
      })
      .catch(() => setFetchState('error'));
  };

  useEffect(() => { loadPlayers(); }, []);

  // ── Spinner delay ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSubmitting) {
      spinnerTimer.current = setTimeout(() => setShowSpinner(true), 150);
    } else {
      if (spinnerTimer.current) clearTimeout(spinnerTimer.current);
      setShowSpinner(false);
    }
    return () => { if (spinnerTimer.current) clearTimeout(spinnerTimer.current); };
  }, [isSubmitting]);

  // ── Selection ───────────────────────────────────────────────────────────────
  const togglePlayer = (id: number) => {
    if (isSubmitting) return;
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: selectedPlayerIds }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create or rejoin match.'); return; }
      router.push(`/match/${data.id}`);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enoughSelected  = selectedPlayerIds.length >= 4;
  const anyOthersOnline = players.some(p => onlineIds.has(p.id) && p.id !== currentUserId);
  const showLegend      = anyOthersOnline;

  return (
    <form onSubmit={handleSubmit} className="panel h-full flex flex-col p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-1">
        <h2 className="font-cinzel text-3xl font-bold text-dota-gold">Select Players</h2>
        <div className="divider-gold" />
      </div>

      {/* ── Submit error ────────────────────────────────────────────────────── */}
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
        {anyOthersOnline && (
          <p className="font-barlow text-xs text-dota-text-dim flex items-center justify-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-dota-radiant shrink-0" />
            {(() => {
              const others = players.filter(p => onlineIds.has(p.id) && p.id !== currentUserId);
              return others.length === 1
                ? `${others[0].username} is online`
                : `${others.length} players online`;
            })()}
          </p>
        )}
      </div>

      {/* ── Player grid ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-1">

        {fetchState === 'loading' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {fetchState === 'error' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="font-barlow text-sm text-dota-dire-light">Failed to load players.</p>
            <button
              type="button"
              onClick={loadPlayers}
              className="btn-secondary flex items-center gap-2 text-sm py-1.5 px-3"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </div>
        )}

        {fetchState === 'ready' && players.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Users className="w-8 h-8 text-dota-text-dim opacity-40" />
            <p className="font-barlow text-sm text-dota-text-muted">No other players registered yet.</p>
          </div>
        )}

        {fetchState === 'ready' && players.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {players.map(player => {
              const selected  = selectedPlayerIds.includes(player.id);
              const isOnline  = onlineIds.has(player.id) && player.id !== currentUserId;
              const disabled  = isSubmitting;

              return (
                <button
                  key={player.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  aria-label={`${player.username}${isOnline ? ' (online)' : ''}`}
                  disabled={disabled}
                  onClick={() => togglePlayer(player.id)}
                  className={`
                    relative px-3 py-2.5 rounded border text-left font-barlow font-semibold
                    text-sm tracking-wide transition-all select-none
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold focus-visible:ring-offset-2 focus-visible:ring-offset-dota-base
                    disabled:cursor-not-allowed disabled:opacity-50
                    flex items-center gap-2.5
                    ${selected
                      ? 'bg-dota-overlay border-dota-gold text-dota-gold shadow-gold'
                      : 'bg-dota-deep border-dota-border text-dota-text-muted hover:border-dota-border-bright hover:text-dota-text'
                    }
                  `}
                >
                  {/* Avatar */}
                  <PlayerAvatar
                    username={player.username}
                    steamAvatar={player.steam_avatar}
                    size={32}
                    className={`transition-opacity ${selected ? 'ring-2 ring-dota-gold/50 ring-offset-1 ring-offset-dota-overlay' : ''}`}
                  />

                  {/* Name */}
                  <span className="truncate flex-1 min-w-0">{player.username}</span>

                  {/* Selected checkmark */}
                  {selected && (
                    <CheckCircle2
                      className="absolute top-1.5 right-1.5 w-3 h-3 text-dota-gold shrink-0"
                      aria-hidden="true"
                    />
                  )}

                  {/* Online presence dot */}
                  {isOnline && !selected && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-dota-radiant ring-2 ring-dota-deep"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      {showLegend && (
        <div className="flex items-center justify-center gap-1.5 font-barlow text-xs text-dota-text-dim">
          <span className="w-2 h-2 rounded-full bg-dota-radiant shrink-0" />
          Online now
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <p className="stat-label">
          {selectedPlayerIds.length} selected
          {!enoughSelected && selectedPlayerIds.length > 0 && (
            <span className="text-dota-text-dim normal-case font-normal">
              {' '}· need {4 - selectedPlayerIds.length} more
            </span>
          )}
          {selectedPlayerIds.length === 0 && (
            <span className="text-dota-text-dim normal-case font-normal">
              {' '}· select at least 4
            </span>
          )}
        </p>
        <button
          type="submit"
          disabled={!enoughSelected || isSubmitting}
          className="btn-primary min-w-[160px]"
        >
          {showSpinner && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Creating…' : 'Play'}
        </button>
      </div>

    </form>
  );
}
