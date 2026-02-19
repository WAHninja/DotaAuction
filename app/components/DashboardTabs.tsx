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

export default function DashboardTabs({ ongoingMatches, completedMatches }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'stats'>('ongoing');
  const [ongoingVisible, setOngoingVisible] = useState(6);
  const [completedVisible, setCompletedVisible] = useState(6);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [gamesPlayedMap, setGamesPlayedMap] = useState<GamesPlayedMap>({});

  useEffect(() => {
    ongoingMatches.forEach(match => {
      if (gamesPlayedMap[match.id] !== undefined) return;
      fetch(`/api/match/${match.id}/games-played`)
        .then(res => res.json())
        .then(data => {
          setGamesPlayedMap(prev => ({ ...prev, [match.id]: data.gamesPlayed }));
        })
        .catch(err => {
          console.error(`Failed to fetch games played for match ${match.id}`, err);
        });
    });
  }, [ongoingMatches]);

  const loadMore = (type: 'ongoing' | 'completed') => {
    if (type === 'ongoing') {
      setLoadingOngoing(true);
      setTimeout(() => {
        setOngoingVisible(v => v + 5);
        setLoadingOngoing(false);
      }, 500);
    } else {
      setLoadingCompleted(true);
      setTimeout(() => {
        setCompletedVisible(v => v + 5);
        setLoadingCompleted(false);
      }, 500);
    }
  };

  const TabButton = ({ tab }: { tab: 'ongoing' | 'completed' | 'stats' }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-5 py-2 font-semibold rounded-t-lg transition ${
        activeTab === tab
          ? 'bg-orange-500 text-white shadow-md'
          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
      }`}
    >
      {tab.charAt(0).toUpperCase() + tab.slice(1)}
    </button>
  );

  const MatchTeams = ({ team_a_usernames, team_1_usernames }: { team_a_usernames?: string[], team_1_usernames?: string[] }) => (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {team_a_usernames && (
        <div className="bg-lime-900/30 p-2 sm:p-3 rounded-lg border border-lime-700/40">
          <p className="text-xs font-semibold text-lime-300 mb-1 sm:mb-2">Team A</p>
          <div className="flex flex-wrap gap-2">
            {team_a_usernames.map(u => (
              <span key={u} className="bg-lime-700/80 text-white text-xs px-2 py-1 rounded-full">{u}</span>
            ))}
          </div>
        </div>
      )}
      {team_1_usernames && (
        <div className="bg-red-900/30 p-2 sm:p-3 rounded-lg border border-red-700/40">
          <p className="text-xs font-semibold text-red-300 mb-1 sm:mb-2">Team 1</p>
          <div className="flex flex-wrap gap-2">
            {team_1_usernames.map(u => (
              <span key={u} className="bg-red-700/80 text-white text-xs px-2 py-1 rounded-full">{u}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const MatchCard = ({ match, isCompleted }: { match: Match; isCompleted: boolean }) => {
    const gamesPlayed = gamesPlayedMap[match.id];

    return (
      <div
        className={`p-4 rounded-xl shadow-xl transition-transform hover:scale-[1.02] flex flex-col justify-between ${
          isCompleted
            ? 'bg-slate-800/80 border border-slate-600'
            : 'bg-slate-700/80 border border-orange-500/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-2 gap-2 sm:gap-0">
          <span className="font-semibold text-sm flex items-center gap-2 flex-wrap">
            Match #{match.id}
            {isCompleted ? (
              <span className="text-yellow-400 text-xs flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Winner: {match.winner_username || 'Not recorded'}
              </span>
            ) : (
              <span className="text-orange-400 text-xs flex items-center gap-1">
                <PlayCircle className="h-4 w-4" />
                {gamesPlayed === undefined ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                  </span>
                ) : (
                  <>Current Game #{gamesPlayed}</>
                )}
              </span>
            )}
          </span>

          <Link href={`/match/${match.id}`} className="mt-2 sm:mt-0">
            <button
              className={`px-3 py-1 text-sm rounded-md font-semibold text-white ${
                isCompleted ? 'bg-slate-600 hover:bg-slate-700' : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {isCompleted ? 'View' : 'Continue'}
            </button>
          </Link>
        </div>

        <MatchTeams
          team_a_usernames={match.team_a_usernames}
          team_1_usernames={match.team_1_usernames}
        />
      </div>
    );
  };

  const EmptyState = ({ type }: { type: 'ongoing' | 'completed' }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-slate-400">
      {type === 'ongoing' ? (
        <>
          <Swords className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-semibold mb-1">No ongoing matches</p>
          <p className="text-sm">Select your players above to start a new match.</p>
        </>
      ) : (
        <>
          <Trophy className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-semibold mb-1">No completed matches yet</p>
          <p className="text-sm">Finished matches will appear here.</p>
        </>
      )}
    </div>
  );

  const MatchGrid = ({ matches, visible, type }: { matches: Match[]; visible: number; type: 'ongoing' | 'completed' }) => {
    const isCompleted = type === 'completed';
    const loading = type === 'ongoing' ? loadingOngoing : loadingCompleted;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.length === 0 ? (
          <EmptyState type={type} />
        ) : (
          <>
            {matches.slice(0, visible).map(match => (
              <MatchCard key={match.id} match={match} isCompleted={isCompleted} />
            ))}
            {visible < matches.length && (
              <div className="col-span-full flex justify-center mt-2 sm:mt-4">
                <button
                  onClick={() => loadMore(type)}
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
                >
                  {loading ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4 mb-2">
        {(['ongoing', 'completed', 'stats'] as const).map(tab => (
          <TabButton key={tab} tab={tab} />
        ))}
      </div>

      <div className="mb-4 border-b border-slate-600" />

      {activeTab === 'ongoing' && <MatchGrid matches={ongoingMatches} visible={ongoingVisible} type="ongoing" />}
      {activeTab === 'completed' && <MatchGrid matches={completedMatches} visible={completedVisible} type="completed" />}
      {activeTab === 'stats' && <StatsTab />}
    </div>
  );
}
