'use client';

import Image from 'next/image';
import { Trophy, Swords, Hash, Calendar, CalendarCheck, Repeat2, Eye, Coins } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import Link from 'next/link';
import type { ViewerState, WinType } from '@/types';

type WinnerBannerProps = {
  winnerName?: string;
  viewerState: ViewerState;
  winType?: WinType | null;
  totalGames?: number;
  matchCreatedAt?: string;
  /**
   * When the final game of the match finished — i.e. when the match itself
   * concluded. Pass the last entry in `history`'s finishedAt. Falls back to
   * not rendering the "Finished" stat at all if unavailable (e.g. older
   * matches predating the finished_at column).
   */
  matchFinishedAt?: string | null;
  winnerRecord?: { wins: number; losses: number };
  viewerRecord?: { wins: number; losses: number };
  winnerTimesTraded?: number;
};

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

// ── Win type badge ────────────────────────────────────────────────────────────
// Shown on all variants so spectators and losers also see how the match ended.

function WinTypeBadge({ winType }: { winType: WinType | null | undefined }) {
  if (!winType) return null;

  if (winType === 'gold_threshold') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded border font-barlow text-xs font-semibold bg-dota-gold/15 border-dota-gold/40 text-dota-gold">
        <Coins className="w-3 h-3" aria-hidden="true" />
        Gold Threshold Victory — 100,000 gold reached
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded border font-barlow text-xs font-semibold bg-dota-radiant/15 border-dota-radiant/40 text-dota-radiant-light">
      <Swords className="w-3 h-3" aria-hidden="true" />
      Last Standing Victory
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function WinnerBanner({
  winnerName,
  viewerState,
  winType,
  totalGames,
  matchCreatedAt,
  matchFinishedAt,
  winnerRecord,
  viewerRecord,
  winnerTimesTraded,
}: WinnerBannerProps) {
  const { width, height } = useWindowSize();

  const formattedStartDate  = matchCreatedAt   ? formatDate(matchCreatedAt)   : null;
  const formattedFinishDate = matchFinishedAt  ? formatDate(matchFinishedAt)  : null;

  // Gold threshold wins get a gold confetti palette; last-standing gets the
  // standard Dota palette.
  const confettiColors = winType === 'gold_threshold'
    ? ['#c8a951', '#dfc06a', '#9a7d35', '#e8d5a0', '#f5e87a']
    : ['#c8a951', '#dfc06a', '#4a9b3c', '#c0392b', '#e8e0d0'];

  // ── Victory variant ────────────────────────────────────────────────────────
  // The winner's own name already appears as the subject of the prose line
  // below ("X claims the Aegis") — it is intentionally NOT repeated in a
  // "Champion" stat card here, since that would just echo the headline back
  // at the person who already knows they won.
  if (viewerState === 'winner') {
    return (
      <>
        <Confetti
          width={width}
          height={height}
          numberOfPieces={300}
          recycle={false}
          colors={confettiColors}
        />

        <p className="sr-only" aria-live="assertive" aria-atomic="true">
          Victory!{winnerName ? ` ${winnerName} wins` : ''} the match
          {totalGames != null ? ` after ${totalGames} games` : ''}.
          {winType === 'gold_threshold' ? ' Won by reaching 100,000 gold.' : ''}
        </p>

        <div className="relative flex flex-col items-center justify-center mt-6 mb-10 rounded-xl overflow-hidden panel border-dota-gold/40 min-h-[280px]">
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
                  {winType === 'gold_threshold'
                    ? 'amassed a fortune and claimed the Aegis.'
                    : 'claims the Aegis. Glory is yours.'}
                </>
              ) : (
                'A champion rises. Glory is yours.'
              )}
            </p>

            <div className="flex justify-center">
              <WinTypeBadge winType={winType} />
            </div>

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
              {formattedStartDate && (
                <StatItem
                  icon={Calendar}
                  label="Started"
                  value={formattedStartDate}
                />
              )}
              {formattedFinishDate && (
                <StatItem
                  icon={CalendarCheck}
                  label="Finished"
                  value={formattedFinishDate}
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
  // Here the "Champion" stat IS kept — the prose line above names the winner,
  // but unlike the winner's own view, the loser benefits from also seeing it
  // surfaced as a structured stat alongside their own record, games, and dates.
  if (viewerState === 'loser') {
    return (
      <div className="relative flex flex-col items-center justify-center mt-6 mb-10 rounded-xl overflow-hidden panel border-dota-dire/40 min-h-[280px]">
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
            {winType === 'gold_threshold'
              ? 'accumulated 100,000 gold and claimed the Aegis.'
              : 'has claimed the Aegis.'}
          </p>

          <div className="flex justify-center">
            <WinTypeBadge winType={winType} />
          </div>

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
            {formattedStartDate && (
              <StatItem
                icon={Calendar}
                label="Started"
                value={formattedStartDate}
              />
            )}
            {formattedFinishDate && (
              <StatItem
                icon={CalendarCheck}
                label="Finished"
                value={formattedFinishDate}
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
  // Same reasoning as the loser variant — the Champion stat is the only place
  // a spectator sees the winner's name in structured form, so it stays.
  return (
    <div className="relative flex flex-col items-center justify-center mt-6 mb-10 rounded-xl overflow-hidden panel border-dota-gold/20 min-h-[280px]">
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
          {winType === 'gold_threshold'
            ? 'accumulated 100,000 gold and claimed the Aegis.'
            : 'has claimed the Aegis.'}
        </p>

        <div className="flex justify-center">
          <WinTypeBadge winType={winType} />
        </div>

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
          {formattedStartDate && (
            <StatItem
              icon={Calendar}
              label="Started"
              value={formattedStartDate}
            />
          )}
          {formattedFinishDate && (
            <StatItem
              icon={CalendarCheck}
              label="Finished"
              value={formattedFinishDate}
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
