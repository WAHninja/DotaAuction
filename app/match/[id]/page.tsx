'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SelectGameWinnerForm from '../../components/SelectGameWinnerForm';
import AuctionPhase from '../../components/AuctionPhase/index'

export default function MatchPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/match/${id}`);
        if (!res.ok) throw new Error(`Failed to fetch match data: ${res.statusText}`);
        const result = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-4">Loading match...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-4">Match not found.</div>;

  const { match, latestGame, players } = data;

  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];

  const getPlayer = (pid: number) => players.find((p: any) => p.id === pid);

  const isInProgress = latestGame?.status === 'In progress';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Match #{match.id}</h1>

      {latestGame && (
        <>
          <h2 className="text-xl font-semibold mb-2">Latest Game #{latestGame.id}</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-100 p-4 rounded-xl shadow">
              <h3 className="font-bold text-lg mb-2">Team 1</h3>
              <ul>
                {[...new Set(team1)].map((pid) => {
                  const player = getPlayer(pid);
                  return (
                    <li key={`team1-${pid}`}>
                      {player?.username || 'Unknown'} (Gold: {player?.gold ?? 0})
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="bg-gray-100 p-4 rounded-xl shadow">
              <h3 className="font-bold text-lg mb-2">Team A</h3>
              <ul>
                {[...new Set(teamA)].map((pid) => {
                  const player = getPlayer(pid);
                  return (
                    <li key={`teamA-${pid}`}>
                      {player?.username || 'Unknown'} (Gold: {player?.gold ?? 0})
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Select Winner Form */}
      <SelectGameWinnerForm gameId={latestGame.id} show={isInProgress} />

      {match.winning_team && (
        <div className="mb-6">
          <p className="text-green-700 font-medium">
            Winning Team: {match.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
          </p>
        </div>
      )}

      {latestGame?.status === 'Auction pending' && (
        <div className="bg-yellow-100 p-4 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-2">Auction Phase</h3>
          <AuctionPhase game={latestGame} currentUserId={getPlayer} />
        </div>
      )}
    </div>
  );
}
