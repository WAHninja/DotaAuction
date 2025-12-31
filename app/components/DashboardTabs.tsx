'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Loader2, CheckCircle, PlayCircle } from 'lucide-react';

// Dynamically import StatsTab to avoid SSR issues
const StatsTab = dynamic(() => import('./StatsTab'), { ssr: false });

type Match = {
  id: number;
  winner_id?: number;
  winner_username?: string; // ✅ added
  team_a_usernames?: string[];
  team_1_usernames?: string[];
};

export default function CreateMatchForm({
  ongoingMatches,
  completedMatches,
}: {
  ongoingMatches: Match[];
  completedMatches: Match[];
}) {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'stats'>('ongoing');
  const [ongoingVisible, setOngoingVisible] = useState(6);
  const [completedVisible, setCompletedVisible] = useState(6);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const [gamesPlayedMap, setGamesPlayedMap] = useState<Record<number, number>>({});

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

  const fetchGamesPlayed = async (matchId: number) => {
    if (gamesPlayedMap[matchId] !== undefined) return;
    try {
      const res = await fetch(`/api/match/${matchId}/games-played`);
      const data = await res.json();
      setGamesPlayedMap(prev => ({ ...prev, [matchId]: data.gamesPlayed }));
    } catch (err) {
      console.error('Failed to fetch games played:', err);
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

  const MatchTeams = ({
    team_a_usernames,
    team_1_usernames,
  }: {
    team_a_usernames?: string[];
    team_1_usernames?: string[];
  }) => (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="bg-lime-900/30 p-3 rounded-lg border border-lime-700/40">
        <p className="text-xs font-semibold text-lime-300 mb-2">Team A</p>
        <div className="flex flex-wrap gap-2">
          {team_a_usernames?.map(u => (
            <span key={u} className="bg-lime-700/80 text-white text-xs px-3 py-1 rounded-full">
              {u}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-red-900/30 p-3 rounded-lg border border-red-700/40">
        <p className="text-xs font-semibold text-red-300 mb-2">Team 1</p>
        <div className="flex flex-wrap gap-2">
          {team_1_usernames?.map(u => (
            <span key={u} className="bg-red-700/80 text-white text-xs px-3 py-1 rounded-full">
              {u}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const MatchCard = ({ match, type }: { match: Match; type: 'ongoing' | 'completed' }) => {
    const isCompleted = type === 'completed';

    useEffect(() => {
      if (!isCompleted) fetchGamesPlayed(match.id);
    }, [match.id, isCompleted]);

    return (
      <div
        className={`p-4 rounded-xl shadow-xl transition-transform hover:scale-[1.02] ${
          isCompleted
            ? 'bg-slate-800/80 border border-slate-600'
            : 'bg-slate-700/80 border border-orange-500/40'
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm">
            Match #{match.id}{' '}
            {isCompleted ? (
              <span className="text-yellow-400 text-xs flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Winner: {match.winner_username ?? 'Unknown'}
              </span>
            ) : (
              <span className="text-orange-400 text-xs flex items-center gap-1">
                <PlayCircle className="h-4 w-4" />
                Current Game #{gamesPlayedMap[match.id] ?? '?'}
              </span>
            )}
          </span>

          <Link href={`/match/${match.id}`}>
            <button
              className={`px-3 py-1 text-sm rounded-md font-semibold ${
                isCompleted
                  ? 'bg-slate-600 hover:bg-slate-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              } text-white`}
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

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4 mb-2">
        {(['ongoing', 'completed', 'stats'] as const).map(tab => (
          <TabButton key={tab} tab={tab} />
        ))}
      </div>

      <div className="mb-4 border-b border-slate-600" />

      {activeTab === 'ongoing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ongoingMatches.slice(0, ongoingVisible).map(m => (
            <MatchCard key={m.id} match={m} type="ongoing" />
          ))}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedMatches.slice(0, completedVisible).map(m => (
            <MatchCard key={m.id} match={m} type="completed" />
          ))}
        </div>
      )}

      {activeTab === 'stats' && <StatsTab />}
    </div>
  );
}
