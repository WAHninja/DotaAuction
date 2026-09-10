'use client';

import StatsProvider, { useStats } from '@/app/components/stats/StatsProvider';
import YouCard from '@/app/components/stats/league/YouCard';
import StandingsTable from '@/app/components/stats/league/StandingsTable';
import LeagueVitals from '@/app/components/stats/league/LeagueVitals';

/**
 * /stats — the league view.
 *
 * Global is the default scope: you land on the whole league, with your own row
 * promoted into YouCard at the top so the personal view costs no navigation.
 * The standings table below is the index you reach individual players through.
 *
 * StatsProvider is mounted here rather than inside each panel, so the payload
 * is fetched once for the page. It is also mounted on the player route; moving
 * it above both in a shared layout would let a click through from the table
 * reuse the fetch entirely, which is worth doing once the player view settles.
 */
export default function StatsPage() {
  return (
    <StatsProvider>
      <StatsPageInner />
    </StatsProvider>
  );
}

function StatsPageInner() {
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
        <h1 className="font-cinzel text-3xl font-bold text-dota-gold">League Stats</h1>
        <div className="divider-gold w-48 mx-auto" />
      </header>

      <YouCard />

      <LeagueVitals payload={payload} />

      <StandingsTable
        players={payload.players}
        dotaStats={payload.playerDotaStats}
        highlightUsername={me?.username ?? null}
      />
    </main>
  );
}
