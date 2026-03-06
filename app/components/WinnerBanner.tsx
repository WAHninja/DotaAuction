'use client';

import Image from 'next/image';
import { Trophy, Swords, Hash, Calendar, Repeat2, Eye } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewerState = 'winner' | 'loser' | 'spectator';

type WinnerBannerProps = {
  winnerName?: string;
  viewerState: ViewerState;
  totalGames?: number;
  matchCreatedAt?: string;
  // How many games the winner won/lost across the match
  winnerRecord?: { wins: number; losses: number };
  // How many games the viewing loser won/lost (only meaningful for 'loser')
  viewerRecord?: { wins: number; losses: number };
  // How many times the winner was traded during the match (hidden when 0)
  winnerTimesTraded?: number;
};

// ---------------------------------------------------------------------------
// StatItem
// ---------------------------------------------------------------------------

function StatItem({
  icon: Icon,
  label,
  value,
  valueClass = 'text-dota-text',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-dota-text-muted">
        <Icon className="w-3 h-3" aria-hidden="true" />
        <span className="font-barlow text-[10px] uppercase tracking-widest font-semibold">
          {label}
        </span>
      </div>
      <span className={`font-barlow font-bold text-sm tabular-nums ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WinnerBanner
// ---------------------------------------------------------------------------

export default function WinnerBanner({
  winnerName,
  viewerState,
  totalGames,
  matchCreatedAt,
  winnerRecord,
  viewerRecord,
  winnerTimesTraded,
}: WinnerBannerProps) {
  const { width, height } = useWindowSize();

  const formattedDate = matchCreatedAt
    ? new Date(matchCreatedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // ── Victory variant ────────────────────────────────────────────────────────
  if (viewerState === 'winner') {
    return (
      <>
        <Confetti
          width={width}
          height={height}
          numberOfPieces={300}
          recycle={false}
          colors={['#c8a951', '#dfc06a', '#4a9b3c', '#c0392b', '#e8e0d0']}
        />

        {/* Screen reader announcement — confetti conveys nothing to AT */}
        <p className="sr-only" aria-live="assertive" aria-atomic="true">
          Victory!{winnerName ? ` ${winnerName} wins` : ''} the match
          {totalGames != null ? ` after ${totalGames} games` : ''}.
        </p>

        <div className="relative flex flex-col items-center justify-center mt-6 mb-10 rounded-xl overflow-hidden panel border-dota-gold/40 min-h-[260px]">
          <Image
            src="/rewards_aegis2024.png"
            alt=""
            aria-hidden="true"
            width={420}
            height={420}
            sizes="420px"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
            style={{ mixBlendMode: 'screen' }}
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(13,17,23,0.55) 0%, transparent 100%)',
            }}
          />

          <div className="relative z-10 text-center space-y-3 py-12 px-8">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-6 h-6 text-dota-gold" aria-hidden="true" />
              <h2 className="font-cinzel text-4xl font-black text-dota-gold text-glow-gold">
                Victory!
              </h2>
              <Trophy className="w-6 h-6 text-dota-gold" aria-hidden="true" />
            </div>

            <p className="font-barlow text-sm text-dota-text-muted italic tracking-wide">
              {winnerName ? (
                <>
                  <span className="text-dota-gold font-semibold not-italic">
                    {winnerName}
                  </span>{' '}
                  claims the Aegis. Glory is yours.
                </>
              ) : (
                'A champion rises. Glory is yours.'
              )}
            </p>

            <div className="divider-gold w-32 mx-auto" />

            <div className="flex flex-wrap items-center justify-center gap-6 pt-1 pb-0.5">
              {/* Personal record — most meaningful stat for the winner */}
              {winnerRecord && (
                <StatItem
                  icon={Swords}
                  label="Your Record"
                  value={`${winnerRecord.wins}W – ${winnerRecord.losses}L`}
                  valueClass="text-dota-radiant-light"
                />
              )}
              {totalGames != null && (
                <StatItem
                  icon={Hash}
                  label="Total Games"
                  value={String(totalGames)}
                />
              )}
              {formattedDate && (
                <StatItem
                  icon={Calendar}
                  label="Started"
                  value={formattedDate}
                />
              )}
              {/* Only show if actually traded — "Traded 0 times" is meaningless */}
              {winnerTimesTraded != null && winnerTimesTraded > 0 && (
                <StatItem
                  icon={Repeat2}
                  label="Times Traded"
                  value={String(winnerTimesTraded)}
                  valueClass="text-dota-text-muted"
                />
              )}
            </div>

            <Link
              href="/dashboard"
              className="btn-secondary text-xs px-4 py-1.5 mt-1 inline-flex items-center justify-center gap-2"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Defeat variant ─────────────────────────────────────────────────────────
  if (viewerState === 'loser') {
    return (
      <div className="relative flex flex-col items-center justify-center mt-6 mb-10 rounded-xl overflow-hidden panel border-dota-dire/40 min-h-[260px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(192,57,43,0.10) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 text-center space-y-3 py-10 px-8">
          <div className="flex items-center justify-center gap-3">
            <Swords className="w-5 h-5 text-dota-dire-light opacity-80" aria-hidden="true" />
            <h2 className="font-cinzel text-3xl font-bold text-dota-dire-light">
              Defeated
            </h2>
            <Swords className="w-5 h-5 text-dota-dire-light opacity-80" aria-hidden="true" />
          </div>

          <p className="font-barlow text-sm text-dota-text-muted italic tracking-wide">
            <span className="text-dota-gold font-semibold not-italic">
              {winnerName ?? 'A champion'}
            </span>{' '}
            has claimed the Aegis.
          </p>

          <div className="divider w-32 mx-auto" />

          <div className="flex flex-wrap items-center justify-center gap-6 pt-1 pb-0.5">
            {/* Champion — header badge removed so this is now the only mention */}
            {winnerName && (
              <StatItem
                icon={Trophy}
                label="Champion"
                value={winnerName}
                valueClass="text-dota-gold"
              />
            )}
            {/* Viewer's own record — gives the loser something personal */}
            {viewerRecord && (
              <StatItem
                icon={Swords}
                label="Your Record"
                value={`${viewerRecord.wins}W – ${viewerRecord.losses}L`}
                valueClass="text-dota-dire-light"
              />
            )}
            {totalGames != null && (
              <StatItem
                icon={Hash}
                label="Total Games"
                value={String(totalGames)}
              />
            )}
            {formattedDate && (
              <StatItem
                icon={Calendar}
                label="Started"
                value={formattedDate}
              />
            )}
          </div>

          <Link
            href="/dashboard"
            className="btn-ghost text-xs px-4 py-1.5 mt-1 inline-flex items-center justify-center gap-2"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Spectator variant ──────────────────────────────────────────────────────
  // Neutral — no confetti, no Defeated, no personal stats.
  // Shows Champion + Total Games + Started since all three are informative
  // to someone watching from outside the match.
  return (
    <div className="relative flex flex-col items-center justify-center mt-6 mb-10 rounded-xl overflow-hidden panel border-dota-gold/20 min-h-[260px]">
      <Image
        src="/rewards_aegis2024.png"
        alt=""
        aria-hidden="true"
        width={420}
        height={420}
        sizes="420px"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none opacity-40"
        style={{ mixBlendMode: 'screen' }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(13,17,23,0.70) 0%, transparent 100%)',
        }}
      />

      <div className="relative z-10 text-center space-y-3 py-12 px-8">
        <div className="flex items-center justify-center gap-3">
          <Eye className="w-5 h-5 text-dota-text-muted" aria-hidden="true" />
          <h2 className="font-cinzel text-3xl font-bold text-dota-text">
            Match Complete
          </h2>
          <Eye className="w-5 h-5 text-dota-text-muted" aria-hidden="true" />
        </div>

        <p className="font-barlow text-sm text-dota-text-muted italic tracking-wide">
          <span className="text-dota-gold font-semibold not-italic">
            {winnerName ?? 'A champion'}
          </span>{' '}
          has claimed the Aegis.
        </p>

        <div className="divider w-32 mx-auto" />

        <div className="flex flex-wrap items-center justify-center gap-6 pt-1 pb-0.5">
          {winnerName && (
            <StatItem
              icon={Trophy}
              label="Champion"
              value={winnerName}
              valueClass="text-dota-gold"
            />
          )}
          {totalGames != null && (
            <StatItem
              icon={Hash}
              label="Total Games"
              value={String(totalGames)}
            />
          )}
          {formattedDate && (
            <StatItem
              icon={Calendar}
              label="Started"
              value={formattedDate}
            />
          )}
        </div>

        <Link
          href="/dashboard"
          className="btn-ghost text-xs px-4 py-1.5 mt-1 inline-flex items-center justify-center gap-2"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
