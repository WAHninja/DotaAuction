'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

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
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 rounded-md font-semibold transition ${
        activeTab === tab
          ? 'bg-blue-600 text-white'
          : tab === 'stats'
          ? 'bg-gray-300 text-gray-600'
          : 'bg-gray-700 text-gray-300'
      }`}
    >
      {tab === 'ongoing' && 'Ongoing Matches'}
      {tab === 'completed' && 'Completed Matches'}
      {tab === 'stats' && 'Stats'}
    </button>
  );

  const MatchTeams = ({ match }: { match: Match }) => (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {/* Team A */}
      <div>
        <p className="text-xs text-blue-300 mb-1">Team A</p>
        <div className="flex flex-wrap gap-2">
          {match.team_a_usernames?.map((username) => (
            <span
              key={username}
              className="bg-blue-700/60 text-white text-xs font-semibold px-3 py-1 rounded-full"
            >
              {username}
            </span>
          ))}
        </div>
      </div>
      {/* Team 1 */}
      <div>
        <p className="text-xs text-red-300 mb-1">Team 1</p>
        <div className="flex flex-wrap gap-2">
          {match.team_1_usernames?.map((username) => (
            <span
              key={username}
              className="bg-red-700/60 text-white text-xs font-semibold px-3 py-1 rounded-full"
            >
              {username}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

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
      <div className="text-center col-span-full">
        <button
          onClick={onClick}
          disabled={loading}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              Loading...
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
      <div className="flex justify-center gap-4 mb-4">
        {(['ongoing', 'completed', 'stats'] as const).map((tab) => (
          <TabButton key={tab} tab={tab} />
        ))}
      </div>

      {/* Ongoing Matches */}
      {activeTab === 'ongoing' && (
        <div className="space-y-4">
          {ongoingMatches.length > 0 ? (
            <>
              {ongoingMatches.slice(0, ongoingVisible).map((match) => (
                <div
                  key={match.id}
                  className="bg-blue-900/80 p-4 rounded-xl shadow hover:scale-105 transition-transform duration-300 ease-in-out"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Match #{match.id}</span>
                    <Link href={`/match/${match.id}`}>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">
                        Continue
                      </button>
                    </Link>
                  </div>
                  <div className="text-sm text-gray-300">
                    <p>
                      <strong>Current Game:</strong> #{match.current_game_id}
                    </p>
                  </div>
                  <MatchTeams match={match} />
                </div>
              ))}
              <LoadMoreButton
                onClick={() => loadMore('ongoing')}
                loading={loadingOngoing}
                hidden={ongoingVisible >= ongoingMatches.length}
              />
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center">No ongoing matches yet.</p>
          )}
        </div>
      )}

      {/* Completed Matches */}
      {activeTab === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedMatches.length > 0 ? (
            <>
              {completedMatches.slice(0, completedVisible).map((match) => (
                <div
                  key={match.id}
                  className="bg-gray-800/80 p-4 rounded-xl shadow hover:scale-105 transition-transform duration-300 ease-in-out"
                >
                  <div className="flex justify-between items-center">
                    <span>
                      Match #{match.id} – Winner:{' '}
                      <strong>{match.winning_team === 'team_1' ? 'Team 1' : 'Team A'}</strong>
                    </span>
                    <Link href={`/match/${match.id}`}>
                      <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm">
                        View
                      </button>
                    </Link>
                  </div>
                  <p className="text-sm text-gray-300">
                    Players: {match.players?.join(', ')}
                  </p>
                </div>
              ))}
              <LoadMoreButton
                onClick={() => loadMore('completed')}
                loading={loadingCompleted}
                hidden={completedVisible >= completedMatches.length}
              />
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center">No completed matches.</p>
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
