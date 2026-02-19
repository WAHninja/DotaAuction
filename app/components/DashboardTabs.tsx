'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Loader2, CheckCircle, PlayCircle, Swords, Trophy } from 'lucide-react';

const StatsTab = dynamic(() => import('./StatsTab'), { ssr: false });

import type { DashboardMatch as Match } from '@/types';

type DashboardTabsProps = {
  ongoingMatches: Match[];
  completedMatches: Match[];
};

type GamesPlayedMap = Record<number, number>;

type Tab = 'ongoing' | 'completed' | 'stats';

const TAB_LABELS: Record<Tab, string> = {
  ongoing:   'Ongoing',
  completed: 'Completed',
  stats:     'Stats',
};

export default function DashboardTabs({ ongoingMatches, completedMatches }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('ongoing');
  const [ongoingVisible, setOngoingVisible] = useState(6);
  const [completedVisible, setCompletedVisible] = useState(6);
  const [gamesPlayedMap, setGamesPlayedMap] = useState<GamesPlayedMap>({});

  useEffect(() => {
    ongoingMatches.forEach(match => {
      if (gamesPlayedMap[match.id] !== undefined) return;
      fetch(`/api/match/${match.id}/games-played`)
        .then(res => res.json())
        .then(data => setGamesPlayedMap(prev => ({ ...prev, [match.id]: data.gamesPlayed })))
        .catch(err => console.error(`Failed to fetch games played for match ${match.id}`, err));
    });
  }, [ongoingMatches]);

  // ── Sub-components ──────────────────────────────────────────────────────────

  const TabButton = ({ tab }: { tab: Tab }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`font-barlow font-semibold text-sm tracking-widest uppercase px-5 py-2 rounded transition-all ${
          active
            ? 'bg-dota-gold text-dota-base shadow-gold'
            : 'bg-dota-surface border border-dota-border text-dota-text-muted hover:text-dota-text hover:border-dota-border-bright'
        }`}
      >
        {TAB_LABELS[tab]}
      </button>
    );
  };

  const TeamRoster = ({
    usernames,
    faction,
  }: {
    usernames?: string[];
    faction: 'radiant' | 'dire';
  }) => {
    if (!usernames?.length) return null;
    const isRadiant = faction === 'radiant';
    return (
      <div className={isRadiant ? 'team-radiant-panel p-2.5 rounded-lg' : 'team-dire-panel p-2.5 rounded-lg'}>
        <p className={`stat-label mb-1.5 ${isRadiant ? 'text-dota-radiant-light' : 'text-dota-dire-light'}`}>
          {isRadiant ? 'Team 1' : 'Team A'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {usernames.map(u => (
            <span
              key={u}
              className={`font-barlow text-xs font-semibold px-2 py-0.5 rounded ${
                isRadiant
                  ? 'bg-dota-radiant/20 text-dota-radiant-light border border-dota-radiant/30'
                  : 'bg-dota-dire/20 text-dota-dire-light border border-dota-dire/30'
              }`}
            >
              {u}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const MatchCard = ({ match, isCompleted }: { match: Match; isCompleted: boolean }) => {
    const gamesPlayed = gamesPlayedMap[match.id];

    return (
      <div className={`panel p-4 flex flex-col gap-3 hover:border-dota-border-bright transition-colors ${
        !isCompleted ? 'border-dota-gold/30' : ''
      }`}>

        {/* Card header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <p className="font-barlow font-bold text-dota-text tracking-wide">
              Match #{match.id}
            </p>

            {isCompleted ? (
              <span className="flex items-center gap-1.5 font-barlow text-xs text-dota-gold">
                <CheckCircle className="w-3.5 h-3.5" />
                Winner: {match.winner_username || 'Not recorded'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-barlow text-xs text-dota-text-muted">
                <PlayCircle className="w-3.5 h-3.5 text-dota-radiant-light" />
                {gamesPlayed === undefined ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                  </span>
                ) : (
                  <span>Game <strong className="text-dota-text">#{gamesPlayed}</strong></span>
                )}
              </span>
            )}
          </div>

          <Link href={`/match/${match.id}`}>
            <button className={isCompleted ? 'btn-secondary text-sm py-1.5 px-3' : 'btn-primary text-sm py-1.5 px-3'}>
              {isCompleted ? 'View' : 'Continue'}
            </button>
          </Link>
        </div>

        {/* Team rosters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TeamRoster usernames={match.team_1_usernames} faction="radiant" />
          <TeamRoster usernames={match.team_a_usernames} faction="dire" />
        </div>
      </div>
    );
  };

  const EmptyState = ({ type }: { type: 'ongoing' | 'completed' }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-dota-text-muted">
      {type === 'ongoing' ? (
        <>
          <Swords className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-cinzel text-lg font-bold mb-1 text-dota-text-dim">No ongoing matches</p>
          <p className="font-barlow text-sm">Select your players above to start a new match.</p>
        </>
      ) : (
        <>
          <Trophy className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-cinzel text-lg font-bold mb-1 text-dota-text-dim">No completed matches yet</p>
          <p className="font-barlow text-sm">Finished matches will appear here.</p>
        </>
      )}
    </div>
  );

  const MatchGrid = ({
    matches,
    visible,
    onLoadMore,
    type,
  }: {
    matches: Match[];
    visible: number;
    onLoadMore: () => void;
    type: 'ongoing' | 'completed';
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {matches.length === 0 ? (
        <EmptyState type={type} />
      ) : (
        <>
          {matches.slice(0, visible).map(match => (
            <MatchCard key={match.id} match={match} isCompleted={type === 'completed'} />
          ))}
          {visible < matches.length && (
            <div className="col-span-full flex justify-center mt-2">
              <button onClick={onLoadMore} className="btn-secondary">
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Tab bar */}
      <div className="flex justify-center gap-3">
        {(['ongoing', 'completed', 'stats'] as const).map(tab => (
          <TabButton key={tab} tab={tab} />
        ))}
      </div>

      <div className="divider" />

      {/* Tab content */}
      {activeTab === 'ongoing' && (
        <MatchGrid
          matches={ongoingMatches}
          visible={ongoingVisible}
          onLoadMore={() => setOngoingVisible(v => v + 5)}
          type="ongoing"
        />
      )}
      {activeTab === 'completed' && (
        <MatchGrid
          matches={completedMatches}
          visible={completedVisible}
          onLoadMore={() => setCompletedVisible(v => v + 5)}
          type="completed"
        />
      )}
      {activeTab === 'stats' && <StatsTab />}

    </div>
  );
}
