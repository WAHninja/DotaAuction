import { Trophy, Hash, Calendar } from 'lucide-react';

type MatchSummaryProps = {
  winnerName: string;
  totalGames: number;
  // ISO date string for when the match was created. Optional — the date
  // section is omitted if not available rather than showing a broken value.
  matchCreatedAt?: string;
};

// ── MatchSummary ──────────────────────────────────────────────────────────────
//
// Displayed between the team cards and the game history when a match is
// finished. Gives a quick at-a-glance summary of the completed match before
// the viewer digs into the game-by-game breakdown below.
//
// Deliberately kept narrow in scope — champion, total games, and start date.
// More detailed stats (win rates, gold deltas, etc.) live in the GameHistory
// and the global Stats tab.

export default function MatchSummary({ winnerName, totalGames, matchCreatedAt }: MatchSummaryProps) {
  const formattedDate = matchCreatedAt
    ? new Date(matchCreatedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="panel p-5 mb-8">
      {/* Section label */}
      <p className="stat-label text-center mb-4">Match Summary</p>

      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">

        {/* Champion */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-dota-gold/15 border border-dota-gold/30 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-dota-gold" aria-hidden="true" />
          </div>
          <div>
            <p className="stat-label">Champion</p>
            <p className="font-cinzel font-bold text-dota-gold text-lg leading-tight">
              {winnerName}
            </p>
          </div>
        </div>

        <span aria-hidden="true" className="w-px h-10 bg-dota-border hidden sm:block" />

        {/* Total games */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-dota-overlay border border-dota-border flex items-center justify-center shrink-0">
            <Hash className="w-4 h-4 text-dota-text-muted" aria-hidden="true" />
          </div>
          <div>
            <p className="stat-label">Total Games</p>
            <p className="font-barlow font-bold text-dota-text text-lg leading-tight tabular-nums">
              {totalGames}
            </p>
          </div>
        </div>

        {/* Date — only rendered when available */}
        {formattedDate && (
          <>
            <span aria-hidden="true" className="w-px h-10 bg-dota-border hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-dota-overlay border border-dota-border flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-dota-text-muted" aria-hidden="true" />
              </div>
              <div>
                <p className="stat-label">Started</p>
                <p className="font-barlow font-semibold text-dota-text text-sm leading-tight">
                  {formattedDate}
                </p>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
