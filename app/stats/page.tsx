'use client';

import { useStats } from '@/app/components/stats/StatsProvider';
import YouCard from '@/app/components/stats/league/YouCard';
import StandingsTable from '@/app/components/stats/league/StandingsTable';
import LeagueVitals from '@/app/components/stats/league/LeagueVitals';
import HeroLeaderboard from '@/app/components/stats/league/HeroLeaderboard';
import TopCombos from '@/app/components/stats/league/TopCombos';

/**
 * /stats — the general (league-wide) view.
 *
 * Global is the default scope: you land on the whole league, with your own row
 * promoted into YouCard at the top so the personal view costs no navigation.
 * The standings table below is the index you reach individual players through.
 *
 * StatsProvider is mounted in app/stats/layout.tsx, above both this route and
 * the player route, so navigating between them reuses the same fetch instead of
 * re-requesting the payload each time.
 */
export default function StatsPage() {
  const { payload, me, loading, error } = useStats();

  if (loading) {
    return (
      <div className="panel p-8 text-center font-barlow text-dota-text-muted">
        Loading statistics…
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="panel p-8 text-center font-barlow text-dota-dire-light">
        {error ?? 'Failed to load statistics'}
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="font-cinzel text-3xl font-bold text-dota-gold">General Stats</h1>
        <div className="divider-gold w-48 mx-auto" />
      </header>

      <YouCard />

      <LeagueVitals payload={payload} />

      <StandingsTable
        players={payload.players}
        dotaStats={payload.playerDotaStats}
        highlightUsername={me?.username ?? null}
      />

      {/* Owned by heroes and by pairings rather than by players, so both belong
          to the league scope and have no equivalent on a player page. */}
      <HeroLeaderboard heroStats={payload.heroStats} />

      <TopCombos combos={payload.topWinningCombos} />
    </main>
  );
}
