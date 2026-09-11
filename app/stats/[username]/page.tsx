'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useStats } from '@/app/components/stats/StatsProvider';
import { forPlayer, rankOf, leagueAverage, buildAvatarLookup } from '@/lib/stats/select';
import { pct, formatStrength } from '@/lib/stats/format';
import { MIN_GAMES_FOR_RATE, MIN_OFFERS_FOR_STRENGTH } from '@/lib/stats/constants';
import { GLOSSARY } from '@/lib/stats/glossary';
import StatWithRank from '@/app/components/stats/ui/StatWithRank';
import PlayerAvatar from '@/app/components/PlayerAvatar';
import EconomyPanel from '@/app/components/stats/player/EconomyPanel';
import SelectionPanel from '@/app/components/stats/player/SelectionPanel';
import LastStandPanel from '@/app/components/stats/player/LastStandPanel';
import PerformancePanel from '@/app/components/stats/player/PerformancePanel';
import ComparePicker from '@/app/components/stats/player/ComparePicker';
import RelationsPanel from '@/app/components/stats/player/RelationsPanel';
import FormGuide from '@/app/components/stats/ui/FormGuide';

/**
 * /stats/[username] — the player view.
 *
 * Deliberately the smaller half of step 3: it exists so the standings table's
 * rows lead somewhere real rather than to a 404, and so the selectors added in
 * step 2 are exercised by an actual consumer. The remaining panels — economy
 * breakdown, hero detail, form, and the compare-with picker — land in step 4.
 *
 * A client component because it reads the shared payload from context. The
 * username comes from useParams rather than a params prop, which keeps this a
 * plain client component without dealing with the promise-shaped params Next 15
 * passes to server pages.
 */
export default function PlayerStatsPage() {
  const params = useParams<{ username: string }>();
  // Route segments arrive percent-encoded; usernames may contain characters
  // that were escaped on the way in (the standings table encodes them).
  const username = decodeURIComponent(params?.username ?? '');

  const { payload, loading, error } = useStats();

  if (loading) {
    return <Shell><p className="panel p-8 text-center font-barlow text-dota-text-muted">Loading…</p></Shell>;
  }

  if (error || !payload) {
    return <Shell><p className="panel p-8 text-center font-barlow text-dota-dire-light">{error ?? 'Failed to load statistics'}</p></Shell>;
  }

  const player = forPlayer(payload, username);
  const { core, dota } = player;

  // An unknown username is a normal outcome — a stale link, or a player who has
  // not completed a game yet — so it gets a plain message rather than notFound(),
  // which would replace the page chrome with the generic 404.
  if (!core) {
    return (
      <Shell>
        <p className="panel p-12 text-center font-barlow text-dota-text-dim">
          No stats recorded for &ldquo;{username}&rdquo; yet.
        </p>
      </Shell>
    );
  }

  const { players, playerDotaStats, headToHead } = payload;

  const winRateRank = rankOf(players, p => p.username === username, p => pct(p.gamesWon, p.gamesPlayed));
  const valued = players.filter(
    p => p.timesOffered >= MIN_OFFERS_FOR_STRENGTH && p.offerStrengthReceived !== null,
  );
  const marketRank = rankOf(valued, p => p.username === username, p => p.offerStrengthReceived ?? 0);
  const kdaRank     = dota ? rankOf(playerDotaStats, p => p.username === username, p => p.avgKda) : null;

  const avgMarket = leagueAverage(valued, p => p.offerStrengthReceived ?? 0);
  const avgKda  = leagueAverage(playerDotaStats, p => p.avgKda);

  const hasRateSample   = core.gamesPlayed  >= MIN_GAMES_FOR_RATE;
  const hasMarketSample = core.timesOffered >= MIN_OFFERS_FOR_STRENGTH;

  // Named for what the reader is waiting on, not for the component that hides
  // it, and derived from the same thresholds the panels apply.
  const formWins = core.recentForm.filter(r => r === 'W').length;
  const hasStreak = player.streak !== null && player.streak.longestStreak > 0;

  const locked = [
    core.gamesPlayed  >= MIN_GAMES_FOR_RATE        ? null : 'win rate',
    core.timesOffered >= MIN_OFFERS_FOR_STRENGTH   ? null : 'market value',
  ].filter((x): x is string => x !== null);

  return (
    <Shell>
      <div className="panel p-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        {/* Previously fell back to null for anyone but the signed-in user,
            because only /api/me carried an avatar. The stats payload now
            supplies one per player, so every profile shows a real portrait. */}
        <PlayerAvatar
          username={username}
          steamAvatar={core.steamAvatar}
          size={56}
        />
        <div className="min-w-0">
          <h1 className="font-cinzel text-2xl font-bold text-dota-gold truncate">{username}</h1>
          <p className="font-barlow text-sm text-dota-text-muted tabular-nums">
            {core.gamesWon}–{core.gamesPlayed - core.gamesWon} across {core.gamesPlayed} games
          </p>
        </div>
        {/* Form moved up here from its own panel. It is the only figure that
            changes week to week, so it belongs beside the identity rather than
            below four panels of all-time aggregates.

            The "You" badge that used to sit here is gone — the reader knows
            who they are, and the league standings already mark their row. */}
        {core.recentForm.length > 0 && (
          <div className="ml-auto shrink-0">
            <p className="stat-label mb-1.5">Recent form</p>
            <FormGuide form={core.recentForm} />
            <p className="font-barlow text-xs text-dota-text-dim mt-1.5 tabular-nums">
              {formWins}–{core.recentForm.length - formWins} in the last {core.recentForm.length}
              {hasStreak && (
                <span> · longest streak {player.streak!.longestStreak}</span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatWithRank
          label="Win rate"
          value={hasRateSample ? `${pct(core.gamesWon, core.gamesPlayed)}%` : '—'}
          rank={hasRateSample ? winRateRank : null}
          tone="gold"
          hint={GLOSSARY.winRate}
          hintId="tip-winrate"
        />
        <StatWithRank
          label="Market value"
          value={hasMarketSample ? formatStrength(core.offerStrengthReceived) : '—'}
          rank={hasMarketSample ? marketRank : null}
          leagueAvg={avgMarket === null ? null : formatStrength(avgMarket)}
          hint={GLOSSARY.marketValue}
          hintId="tip-market"
        />
        <StatWithRank
          label="Avg KDA"
          value={dota ? dota.avgKda.toFixed(2) : '—'}
          rank={kdaRank}
          leagueAvg={avgKda === null ? null : avgKda.toFixed(2)}
          hint={GLOSSARY.avgKda}
          hintId="tip-kda"
        />
        <StatWithRank
          label="Times sold"
          value={String(core.timesSold)}
          hint={GLOSSARY.timesSold}
          hintId="tip-sold"
          // Raw offers received is a misleading companion figure now that
          // Selection below distinguishes forced offers from real choices.
          leagueAvg={`${core.selectionCount} picked by choice`}
        />
      </div>

      {/* Not enough games is said once, here, rather than by each panel
          announcing its own absence. Panels with nothing to show now render
          nothing at all — seven separate "you have never…" messages read as an
          accusation rather than as context. */}
      {locked.length > 0 && (
        <p className="panel-sunken px-4 py-3 font-barlow text-sm text-dota-text-muted">
          Still building a record —{' '}
          <span className="text-dota-text">{locked.join(', ')}</span>{' '}
          {locked.length === 1 ? 'needs' : 'need'} more games before they mean anything.
        </p>
      )}

      {/* Smaller panels share a two-column grid on wide screens. Previously
          every panel was full width in a single column, so eight of them read
          as eight equally important things and the page had no shape. These
          four are each a handful of figures and do not need the width. */}
      {/*
        Row order is deliberate and reads left-to-right, top-to-bottom:
        Performance and Last Stands are both about playing the game; Economy and
        Selection are both about the auction. Grouping them by subject means a
        reader scanning one row is thinking about one thing.

        Grid items stretch (the default) rather than items-start, so both cards
        in a row end at the same height. Ragged bottoms made the rows read as
        broken rather than as panels of differing content. The panels themselves
        are flex columns with a growing body, so the extra height goes inside
        the card instead of leaving a gap under a short one.
      */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PerformancePanel dota={dota} />
        <LastStandPanel core={core} />
        <EconomyPanel core={core} />
        <SelectionPanel core={core} />
      </div>

      {/*
        Paired rather than stacked full width. Both are narrow-content panels —
        a three-column table and a centred comparison — so at full page width
        each was mostly empty gutter, and Compare's 1fr/auto/1fr rows flung the
        two values so far apart they stopped reading as a comparison.

        They also belong together: one lists everyone you have played with or
        against, the other drills into a single one of them. Stacks below lg,
        where half width would squeeze the table's three columns.
      */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RelationsPanel
          synergy={payload.teammateSynergy}
          headToHead={headToHead}
          username={username}
          avatars={buildAvatarLookup(players)}
        />

        <ComparePicker payload={payload} subject={username} />
      </div>

    </Shell>
  );
}

/** Page chrome shared by the loading, error, unknown-player and loaded states. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    /* max-w-6xl to match /stats. At 4xl the player page was visibly narrower
       than the league page it is reached from, so navigating between them
       shifted the whole layout. */
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/stats"
        className="inline-flex items-center gap-1 font-barlow text-sm text-dota-text-muted hover:text-dota-gold transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        General Stats
      </Link>
      {children}
    </main>
  );
}
