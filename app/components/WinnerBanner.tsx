'use client';

import Image from 'next/image';
import { Trophy, Swords, Hash, Calendar } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import Link from 'next/link';

type WinnerBannerProps = {
  winnerName?: string;
  // true only for the player whose userId === match.winner_id.
  // Controls whether confetti fires and which variant (victory/defeat) renders.
  isWinner: boolean;
  // Match summary stats — both optional so the banner degrades gracefully
  // if the data isn't yet available (e.g. history hasn't loaded).
  totalGames?: number;
  matchCreatedAt?: string;
};

// ── Compact stat item ─────────────────────────────────────────────────────────
// Shared between both variants for consistent layout.
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

export default function WinnerBanner({
  winnerName,
  isWinner,
  totalGames,
  matchCreatedAt,
}: WinnerBannerProps) {
  const { width, height } = useWindowSize();

  const formattedDate = matchCreatedAt
    ? new Date(matchCreatedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Only render the stats row when we have at least one value to show.
  const hasStats = totalGames != null || formattedDate != null;

  // ── Victory variant (winning player only) ──────────────────────────────────
  if (isWinner) {
    return (
      <>
        {/*
          Confetti is intentionally gated behind isWinner. Showing it to the
          losing players would be confusing — only the champion should see it.
        */}
        <Confetti
          width={width}
          height={height}
          numberOfPieces={300}
          recycle={false}
          colors={['#c8a951', '#dfc06a', '#4a9b3c', '#c0392b', '#e8e0d0']}
        />

        <div className="relative flex flex-col items-center justify-center mt-6 mb-10 rounded-xl overflow-hidden panel border-dota-gold/40 min-h-[260px]">
          {/* Aegis — mix-blend-mode: screen drops the black background */}
          <Image
            src="/rewards_aegis2024.png"
            alt=""
            aria-hidden="true"
            width={420}
            height={420}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* Centre vignette — keeps text legible over the bright shield */}
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
              A champion rises. Glory is yours.
            </p>

            <div className="divider-gold w-32 mx-auto" />

            {/* Match summary — sits between the flavour text and the CTA */}
            {hasStats && (
              <div className="flex flex-wrap items-center justify-center gap-6 pt-1 pb-0.5">
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
            )}

            {/*
              Link styled directly as a button — avoids the invalid
              <Link><button> nesting that existed previously.
              href="/dashboard" avoids the unnecessary redirect through "/".
            */}
            <Link
              href="/dashboard"
              className="btn-ghost text-xs px-4 py-1.5 mt-1 inline-flex items-center justify-center gap-2"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Defeat variant (all other players) ─────────────────────────────────────
  //
  // No confetti, Dire-themed colour palette, names the winner so losers know
  // who beat them. Same back-to-dashboard affordance for easy navigation.
  //
  // The defeat variant repeats the winner name in the stats row (Champion)
  // because the italic sentence above it is easy to miss. The explicit label
  // makes the key facts scannable at a glance.
  return (
    <div className="relative flex flex-col items-center justify-center mt-6 mb-10 rounded-xl overflow-hidden panel border-dota-dire/40 min-h-[200px]">
      {/* Subtle Dire glow from the bottom */}
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

        {/* Match summary */}
        {hasStats && (
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
        )}

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
