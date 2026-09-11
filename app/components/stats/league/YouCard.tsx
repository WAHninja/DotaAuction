'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useStats } from '@/app/components/stats/StatsProvider';
import { forPlayer, rankOf, leagueAverage } from '@/lib/stats/select';
import { pct, formatStrength } from '@/lib/stats/format';
import { MIN_GAMES_FOR_RATE, MIN_OFFERS_FOR_STRENGTH } from '@/lib/stats/constants';
import { GLOSSARY } from '@/lib/stats/glossary';
import StatWithRank from '@/app/components/stats/ui/StatWithRank';
import PlayerAvatar from '@/app/components/PlayerAvatar';
import FormGuide from '@/app/components/stats/ui/FormGuide';

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
  // Ranked only among players who clear the sample threshold — otherwise
  // someone with one flattering offer outranks a genuinely valued player.
  const valued = players.filter(
    p => p.timesOffered >= MIN_OFFERS_FOR_STRENGTH && p.offerStrengthReceived !== null,
  );
  const marketRank = rankOf(valued, p => p.username === me.username, p => p.offerStrengthReceived ?? 0);
  const kdaRank  = dota
    ? rankOf(playerDotaStats, p => p.username === me.username, p => p.avgKda)
    : null;

  const ratingRank = rankOf(players, p => p.username === me.username, p => p.rating);

  const avgMarket = leagueAverage(valued, p => p.offerStrengthReceived ?? 0);
  const avgKda  = leagueAverage(playerDotaStats, p => p.avgKda);

  const hasRateSample   = core.gamesPlayed  >= MIN_GAMES_FOR_RATE;
  const hasMarketSample = core.timesOffered >= MIN_OFFERS_FOR_STRENGTH;

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar
          username={me.username}
          steamAvatar={core.steamAvatar ?? me.steam_avatar}
          size={44}
        />
        <div className="min-w-0">
          <p className="stat-label">Your record</p>
          <h2 className="font-cinzel text-xl font-bold text-dota-gold truncate">{me.username}</h2>
        </div>
        {/* A muted text link here read as a caption rather than an action, and
            it is the primary route from the league view into your own detail —
            so it takes the gold secondary button treatment used elsewhere for
            real actions, at full width on narrow screens where the header
            wraps. */}
        <Link
          href={`/stats/${encodeURIComponent(me.username)}`}
          className="btn-secondary ml-auto shrink-0 flex items-center gap-1.5 text-xs py-1.5 px-3"
        >
          View full breakdown
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {core.recentForm.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="stat-label shrink-0">Recent form</span>
          <FormGuide form={core.recentForm} />
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatWithRank
          label="Rating"
          value={String(core.rating)}
          rank={ratingRank}
          tone="gold"
          hint={GLOSSARY.rating}
          hintId="you-tip-rating"
        />
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
          hint={GLOSSARY.winRate}
          hintId="you-tip-winrate"
        />
        <StatWithRank
          label="Market value"
          value={hasMarketSample ? formatStrength(core.offerStrengthReceived) : '—'}
          rank={hasMarketSample ? marketRank : null}
          leagueAvg={avgMarket === null ? null : formatStrength(avgMarket)}
          hint={GLOSSARY.marketValue}
          hintId="you-tip-market"
        />
        <StatWithRank
          label="Avg KDA"
          value={dota ? dota.avgKda.toFixed(2) : '—'}
          rank={kdaRank}
          leagueAvg={avgKda === null ? null : avgKda.toFixed(2)}
          hint={GLOSSARY.avgKda}
          hintId="you-tip-kda"
        />
      </div>
    </div>
  );
}
