'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle, PlayCircle } from 'lucide-react';

type Match = {
  id: number;
  current_game_id?: number;
  team_a_usernames?: string[];
  team_1_usernames?: string[];
  winning_team?: string;
  players?: string[];
};

export default function DashboardTabs({
  ongoingMatches,
  completedMatches,
}: {
  ongoingMatches: Match[];
  completedMatches: Match[];
}) {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'stats'>('ongoing');
  const [ongoingVisible, setOngoingVisible] = useState(5);
  const [completedVisible, setCompletedVisible] = useState(5);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const loadMore = (type: 'ongoing' | 'completed') => {
    if (type === 'ongoing') {
      setLoadingOngoing(true);
      setTimeout(() => {
        setOngoingVisible((prev) => prev + 5);
        setLoadingOngoing(false);
      }, 500);
    } else {
      setLoadingCompleted(true);
      setTimeout(() => {
        setCompletedVisible((prev) => prev + 5);
        setLoadingCompleted(false);
      }, 500);
    }
  };

  const TabButton = ({ tab }: { tab: 'ongoing' | 'completed' | 'stats' }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-5 py-2 font-semibold rounded-t-lg transition ${
        activeTab === tab
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {tab === 'ongoing' && 'Ongoing'}
      {tab === 'completed' && 'Completed'}
      {tab === 'stats' && 'Stats'}
    </button>
  );

  const MatchTeams = ({ match }: { match: Match }) => (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {['team_a', 'team_1'].map((teamKey, idx) => {
        const usernames = teamKey === 'team_a' ? match.team_a_usernames : match.team_1_usernames;
        const color = teamKey === 'team_a' ? 'blue' : 'red';
        const teamName = teamKey === 'team_a' ? 'Team A' : 'Team 1';
        return (
          <div key={teamKey}>
            <p className={`text-xs font-semibold text-${color}-300 mb-1`}>{teamName}</p>
            <div className="flex flex-wrap gap-2">
              {usernames?.map((u) => (
                <span
                  key={u}
                  className={`bg-${color}-700/60 text-white text-xs px-3 py-1 rounded-full`}
                >
                  {u}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const MatchCard = ({
    match,
    type,
  }: {
    match: Match;
    type: 'ongoing' | 'completed';
  }) => {
    const isCompleted = type === 'completed';
    const winner = match.winning_team === 'team_1' ? 'Team 1' : 'Team A';
    return (
      <div
        className={`p-4 rounded-xl shadow-md transition-transform duration-300 hover:scale-105 ${
          isCompleted ? 'bg-gray-800/80' : 'bg-blue-900/80'
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm">
            Match #{match.id}{' '}
            {isCompleted ? (
              <span className="text-green-400 font-normal text-xs flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Winner: {winner}
              </span>
            ) : (
              <span className="text-yellow-300 font-normal text-xs flex items-center gap-1">
                <PlayCircle className="h-4 w-4" /> Current Game #{match.current_game_id}
              </span>
            )}
          </span>
          <Link href={`/match/${match.id}`}>
            <button
              className={`px-3 py-1 text-sm rounded-md text-white font-semibold ${
                isCompleted ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isCompleted ? 'View' : 'Continue'}
            </button>
          </Link>
        </div>

        {isCompleted && match.players ? (
          <p className="text-xs text-gray-300 mb-2">Players: {match.players.join(', ')}</p>
        ) : null}

        <MatchTeams match={match} />
      </div>
    );
  };

  const LoadMoreButton = ({
    onClick,
    loading,
    hidden,
  }: {
    onClick: () => void;
    loading: boolean;
    hidden: boolean;
  }) =>
    !hidden ? (
      <div className="col-span-full text-center mt-4">
        <button
          onClick={onClick}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" /> Loading...
            </>
          ) : (
            'Load More'
          )}
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex justify-center gap-4 border-b border-gray-600 mb-4">
        {(['ongoing', 'completed', 'stats'] as const).map((tab) => (
          <TabButton key={tab} tab={tab} />
        ))}
      </div>

      {/* Ongoing Matches */}
      {activeTab === 'ongoing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ongoingMatches.length > 0 ? (
            <>
              {ongoingMatches.slice(0, ongoingVisible).map((match) => (
                <MatchCard key={match.id} match={match} type="ongoing" />
              ))}
              <LoadMoreButton
                onClick={() => loadMore('ongoing')}
                loading={loadingOngoing}
                hidden={ongoingVisible >= ongoingMatches.length}
              />
            </>
          ) : (
            <p className="text-center text-gray-400 col-span-full">No ongoing matches yet.</p>
          )}
        </div>
      )}

      {/* Completed Matches */}
      {activeTab === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedMatches.length > 0 ? (
            <>
              {completedMatches.slice(0, completedVisible).map((match) => (
                <MatchCard key={match.id} match={match} type="completed" />
              ))}
              <LoadMoreButton
                onClick={() => loadMore('completed')}
                loading={loadingCompleted}
                hidden={completedVisible >= completedMatches.length}
              />
            </>
          ) : (
            <p className="text-center text-gray-400 col-span-full">No completed matches.</p>
          )}
        </div>
      )}

      {/* Stats */}
      {activeTab === 'stats' && (
        <div className="text-center text-gray-400 italic">Coming soon...</div>
      )}
    </div>
  );
}
