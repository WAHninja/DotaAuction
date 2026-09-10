'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useStats } from '@/app/components/stats/StatsProvider';
import { forPlayer, rankOf, leagueAverage } from '@/lib/stats/select';
import { pct, formatNW } from '@/lib/stats/format';
import { MIN_GAMES_FOR_RATE } from '@/lib/stats/constants';
import StatWithRank from '@/app/components/stats/ui/StatWithRank';
import PlayerAvatar from '@/app/components/PlayerAvatar';

/**
 * The signed-in user's own row, promoted out of the standings table.
 *
 * This is what lets the league view stay the default without forcing a choice
 * between "global stats" and "my stats". You get your own figures immediately
 * on arrival, each carrying its league rank, and the full table sits directly
 * beneath — so neither scope is hidden behind the other.
 *
 * Renders nothing at all when there is no signed-in user, or when that user has
 * no stats row yet. An empty personal card above a populated league table would
 * read as breakage rather than as "you haven't played".
 */
export default function YouCard() {
  const { payload, me } = useStats();
  if (!payload || !me) return null;

  const { core, dota } = forPlayer(payload, me.username);
  if (!core) return null;

  const { players, playerDotaStats } = payload;

  // Win rate is ranked on the derived percentage, not on games won — otherwise
  // whoever has simply played most would always top the list.
  const winRateRank = rankOf(
    players,
    p => p.username === me.username,
    p => pct(p.gamesWon, p.gamesPlayed),
  );
  const goldRank = rankOf(players, p => p.username === me.username, p => p.netGold);
  const kdaRank  = dota
    ? rankOf(playerDotaStats, p => p.username === me.username, p => p.avgKda)
    : null;

  const avgGold = leagueAverage(players, p => p.netGold);
  const avgKda  = leagueAverage(playerDotaStats, p => p.avgKda);

  const hasRateSample = core.gamesPlayed >= MIN_GAMES_FOR_RATE;

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar username={me.username} steamAvatar={me.steam_avatar} size={44} />
        <div className="min-w-0">
          <p className="stat-label">Your record</p>
          <h2 className="font-cinzel text-xl font-bold text-dota-gold truncate">{me.username}</h2>
        </div>
        <Link
          href={`/stats/${encodeURIComponent(me.username)}`}
          className="ml-auto shrink-0 flex items-center gap-1 font-barlow text-xs font-semibold text-dota-text-muted hover:text-dota-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold"
        >
          Full breakdown
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatWithRank
          label="Record"
          value={`${core.gamesWon}–${core.gamesPlayed - core.gamesWon}`}
        />
        <StatWithRank
          label="Win rate"
          // Below the sample threshold the percentage is noise, so it is not
          // shown at all — and without a figure a rank would be meaningless too.
          value={hasRateSample ? `${pct(core.gamesWon, core.gamesPlayed)}%` : '—'}
          rank={hasRateSample ? winRateRank : null}
          tone="gold"
        />
        <StatWithRank
          label="Net gold"
          value={`${core.netGold > 0 ? '+' : ''}${core.netGold.toLocaleString()}`}
          rank={goldRank}
          leagueAvg={avgGold === null ? null : formatNW(Math.round(avgGold))}
        />
        <StatWithRank
          label="Avg KDA"
          value={dota ? dota.avgKda.toFixed(2) : '—'}
          rank={kdaRank}
          leagueAvg={avgKda === null ? null : avgKda.toFixed(2)}
        />
      </div>
    </div>
  );
}
