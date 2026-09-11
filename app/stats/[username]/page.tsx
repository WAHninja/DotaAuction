'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useStats } from '@/app/components/stats/StatsProvider';
import { forPlayer, rankOf, leagueAverage, headToHeadFor } from '@/lib/stats/select';
import { pct, formatStrength } from '@/lib/stats/format';
import { MIN_GAMES_FOR_RATE, MIN_OFFERS_FOR_STRENGTH } from '@/lib/stats/constants';
import StatWithRank from '@/app/components/stats/ui/StatWithRank';
import PctBadge from '@/app/components/stats/ui/PctBadge';
import PlayerAvatar from '@/app/components/PlayerAvatar';
import EconomyPanel from '@/app/components/stats/player/EconomyPanel';
import PerformancePanel from '@/app/components/stats/player/PerformancePanel';
import FormPanel from '@/app/components/stats/player/FormPanel';
import ComparePicker from '@/app/components/stats/player/ComparePicker';

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

  const { payload, me, loading, error } = useStats();

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
  const isMe = me?.username === username;

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
  const h2h = headToHeadFor(headToHead, username);

  return (
    <Shell>
      <div className="panel p-5 flex items-center gap-4">
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
        {isMe && <span className="stat-label ml-auto shrink-0">You</span>}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatWithRank
          label="Win rate"
          value={hasRateSample ? `${pct(core.gamesWon, core.gamesPlayed)}%` : '—'}
          rank={hasRateSample ? winRateRank : null}
          tone="gold"
        />
        <StatWithRank
          label="Market value"
          value={hasMarketSample ? formatStrength(core.offerStrengthReceived) : '—'}
          rank={hasMarketSample ? marketRank : null}
          leagueAvg={avgMarket === null ? null : formatStrength(avgMarket)}
        />
        <StatWithRank
          label="Avg KDA"
          value={dota ? dota.avgKda.toFixed(2) : '—'}
          rank={kdaRank}
          leagueAvg={avgKda === null ? null : avgKda.toFixed(2)}
        />
        <StatWithRank
          label="Times sold"
          value={String(core.timesSold)}
          leagueAvg={`${core.timesOffered} offers received`}
        />
      </div>

      <EconomyPanel core={core} />

      <PerformancePanel dota={dota} />

      <FormPanel streak={player.streak} acquisition={player.acquisition} />

      <ComparePicker payload={payload} subject={username} />

      <section className="panel overflow-hidden">
        <div className="px-5 py-4 border-b border-dota-border">
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Head-to-Head</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Record against each opponent, across every game they were on opposing teams
          </p>
        </div>

        {h2h.length === 0 ? (
          <p className="font-barlow text-sm text-dota-text-dim py-8 text-center">
            No recorded matchups yet.
          </p>
        ) : (
          <table className="w-full font-barlow text-sm" aria-label={`Head-to-head record for ${username}`}>
            <thead className="bg-dota-deep/60 border-b border-dota-border">
              <tr className="stat-label">
                <th scope="col" className="px-4 py-2.5 text-left">Opponent</th>
                <th scope="col" className="px-4 py-2.5 text-center">Record</th>
                <th scope="col" className="px-4 py-2.5 text-center">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {h2h.map(r => (
                <tr key={r.opponent} className="border-b border-dota-border/25 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/stats/${encodeURIComponent(r.opponent)}`}
                      className="font-semibold text-dota-text hover:text-dota-gold transition-colors"
                    >
                      {r.opponent}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-dota-text-muted">
                    {r.wins}–{r.losses}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <PctBadge success={r.wins} total={r.games} minGames={MIN_GAMES_FOR_RATE} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Shell>
  );
}

/** Page chrome shared by the loading, error, unknown-player and loaded states. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
