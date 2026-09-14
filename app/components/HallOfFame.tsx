'use client';

import Link from 'next/link';
import { ChevronRight, Crown, Flame, Swords, Trophy } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import type { LeagueRecord } from '@/types';
import { buildAvatarLookup } from '@/lib/stats/select';
import FormGuide from '@/app/components/stats/ui/FormGuide';
import StatsProvider, { useStats } from '@/app/components/stats/StatsProvider';
import Tooltip from '@/app/components/stats/ui/Tooltip';
import RankMedal from '@/app/components/RankMedal';
import PlayerAvatar from '@/app/components/PlayerAvatar';

/**
 * The dashboard's glanceable snapshot.
 *
 * Rewritten to read from /api/stats rather than running its own queries.
 * Previously the dashboard computed its own version of records the stats page
 * also computes — "Fastest Win" and "Shortest match" were the same fact from
 * two different queries with different tie-breaks, so the two pages could name
 * two different people and nothing would notice.
 *
 * What the cards show changed too:
 *
 *   Most Match Wins is gone. It was a cumulative counter, rewarding turning up
 *   rather than playing well — the same fault that removed net gold — and with
 *   seven completed matches it was mostly ties. Rating answers the same
 *   question honestly.
 *
 *   Best Form is new. Every card here used to be an all-time record, and
 *   records by definition rarely move, so the first thing anyone saw on login
 *   had not changed in months. Form changes every session.
 *
 *   Fastest Win is gone, covered by Shortest Match on the stats page.
 *
 * Every name links to that player's page. Twelve names were rendered here and
 * none of them went anywhere.
 */

const MAX_RANK = 3;
const MEDAL_SIZE = 20;
/** Form pips shown on the card. Fewer than the player page's ten — the card is
 *  a quarter of the page width and has a name and a medal to fit alongside. */
const FORM_PIPS = 5;

export default function HallOfFame() {
  return (
    <StatsProvider>
      <HallOfFameInner />
    </StatsProvider>
  );
}

function HallOfFameInner() {
  const { payload, loading } = useStats();

  if (loading || !payload) return <HallOfFameSkeleton />;

  const { players, leagueRecords } = payload;

  // Names in league records are strings, while the avatar lives on the player
  // row — the same join the stats tables need. Without it every face here fell
  // back to a coloured initial while the tables beside them showed portraits.
  const avatars = buildAvatarLookup(players);

  // Match wins, not game wins — the whole match. Ties are common at this scale
  // (seven matches completed), so they break on rating and then on name: a
  // stable order beats whatever the payload happened to arrive in, and a card
  // that reshuffles between loads looks broken.
  const byMatchWins = players
    .filter(p => p.matchesWon > 0)
    .sort((a, b) =>
      b.matchesWon - a.matchesWon ||
      b.rating - a.rating ||
      a.username.localeCompare(b.username))
    .slice(0, MAX_RANK)
    .map(p => ({
      name: p.username,
      value: <>{p.matchesWon}</>,
    }));

  // Ladder leaders. Provisional ratings are excluded rather than dimmed: this
  // is a four-line summary with no room to explain why the name at the top is
  // hedged, and an unproven rating topping the dashboard would misinform.
  const byRating = players
    .filter(p => !p.ratingProvisional)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_RANK)
    .map(p => ({ name: p.username, value: <>{p.rating}</> }));

  // Best recent run. Ties broken by the longer window, so someone 6-0 from six
  // games does not outrank someone 6-1 from ten on the same win count.
  // Ranked on the same window that is displayed. Ranking on ten games while
  // showing five would let a card read W W W W W beneath a player sitting
  // below someone whose visible pips look worse.
  const byForm = players
    .filter(p => p.recentForm.length > 0)
    .map(p => {
      const window = p.recentForm.slice(-FORM_PIPS);
      return {
        name: p.username,
        form: window,
        wins: window.filter(r => r === 'W').length,
        played: window.length,
      };
    })
    .sort((a, b) => b.wins - a.wins || b.played - a.played)
    .slice(0, MAX_RANK)
    .map(p => ({
      name: p.name,
      value: <FormGuide form={p.form} max={FORM_PIPS} compact label="Form" />,
    }));

  return (
    <div className="panel p-3 space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RecordCard
          icon={Trophy}
          title="Matches Won"
          tooltip="Matches won outright. A whole match, not individual games."
          tooltipId="hof-matches"
          entries={byMatchWins}
          accentClass="text-dota-gold"
          iconBgClass="bg-dota-gold/10 border border-dota-gold/20"
          emptyMessage="No matches finished yet"
          avatars={avatars}
        />

        <RecordCard
          icon={Crown}
          title="Rating Leaders"
          tooltip="Highest skill ratings in the league. Accounts for team sizes and the odds of each game, so beating longer odds counts for more. Players still settling are excluded."
          tooltipId="hof-rating"
          entries={byRating}
          accentClass="text-dota-info"
          iconBgClass="bg-dota-info/10 border border-dota-info/20"
          emptyMessage="No settled ratings yet"
          avatars={avatars}
        />

        <RecordCard
          icon={Flame}
          title="Best Form"
          tooltip={`Most wins from the last ${FORM_PIPS} games played, newest on the right. The one figure here that moves every session.`}
          tooltipId="hof-form"
          entries={byForm}
          accentClass="text-dota-radiant-light"
          iconBgClass="bg-dota-radiant/10 border border-dota-radiant/20"
          emptyMessage="No games played yet"
          avatars={avatars}
        />

        <RecordCard
          icon={Swords}
          title="Biggest Underdog"
          tooltip="The most opponents anyone has beaten while alone on their team — which also ends the match outright."
          tooltipId="hof-underdog"
          entries={recordEntries(leagueRecords.biggestUnderdogWins, r => `vs ${r.value}`)}
          accentClass="text-dota-dire-light"
          iconBgClass="bg-dota-dire/10 border border-dota-dire/20"
          emptyMessage="Not set yet"
          avatars={avatars}
        />

      </div>

      <Link
        href="/stats"
        className="flex items-center justify-center gap-1 font-barlow text-xs font-semibold text-dota-text-muted hover:text-dota-gold transition-colors"
      >
        Full stats and player breakdowns
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Converts league records into the entry shape the cards render. */
function recordEntries(
  records: LeagueRecord[],
  format: (r: LeagueRecord) => string,
): { name: string; value: ReactNode }[] {
  return records
    .filter(r => r.player !== null)
    .map(r => ({ name: r.player as string, value: format(r) }));
}

function RecordCard({
  icon: Icon, title, tooltip, tooltipId, entries, accentClass, iconBgClass, emptyMessage,
  avatars,
}: {
  icon: ElementType;
  title: string;
  tooltip: string;
  tooltipId: string;
  entries: { name: string; value: ReactNode }[];
  /** username -> avatar URL, so faces match the rest of the app. */
  avatars: Map<string, string | null>;
  accentClass: string;
  iconBgClass: string;
  emptyMessage: string;
}) {
  return (
    <div className="panel-sunken p-3 space-y-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${iconBgClass}`}>
          <Icon className={`w-3.5 h-3.5 ${accentClass}`} aria-hidden="true" />
        </span>
        {/* The shared portalled Tooltip, not the local one this file used to
            carry. That one rendered inside .panel-sunken, whose clip-path
            trimmed anything overflowing the card — so the explanation was cut
            off mid-sentence. */}
        <Tooltip id={tooltipId} content={tooltip}>
          <span
            className="stat-label truncate cursor-help border-b border-dotted border-dota-text-dim"
            tabIndex={0}
            aria-describedby={tooltipId}
          >
            {title}
          </span>
        </Tooltip>
      </div>

      {entries.length === 0 ? (
        <p className="font-barlow text-xs text-dota-text-dim py-1">{emptyMessage}</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry, i) => (
            <li key={entry.name} className="flex items-center gap-1.5 min-w-0">
              {entries.length > 1 && <RankMedal rank={i + 1} size={MEDAL_SIZE} label={false} />}
              <PlayerAvatar
                username={entry.name}
                steamAvatar={avatars.get(entry.name) ?? null}
                size={18}
              />
              <Link
                href={`/stats/${encodeURIComponent(entry.name)}`}
                className={`font-barlow text-sm truncate hover:text-dota-gold transition-colors ${
                  i === 0 ? 'font-bold text-dota-text' : 'text-dota-text-muted'
                }`}
              >
                {entry.name}
              </Link>
              <span className={`ml-auto shrink-0 font-barlow text-xs font-bold tabular-nums ${accentClass}`}>
                {entry.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Matches the loaded layout so the dashboard does not jump when stats arrive. */
function HallOfFameSkeleton() {
  return (
    <div className="panel p-3 grid grid-cols-2 lg:grid-cols-4 gap-3" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="panel-sunken p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-dota-border/40" />
            <div className="h-3 w-20 rounded bg-dota-border/40" />
          </div>
          {Array.from({ length: 3 }).map((__, j) => (
            <div key={j} className="flex items-center gap-1.5">
              <div className="rounded bg-dota-border/30" style={{ width: MEDAL_SIZE, height: MEDAL_SIZE }} />
              <div className="h-3 flex-1 rounded bg-dota-border/30" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
