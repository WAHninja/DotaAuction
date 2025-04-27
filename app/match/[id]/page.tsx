'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TeamCard from '../../components/TeamCard';
import AuctionPhase from '../../components/AuctionPhase';
import SelectGameWinnerForm from '../../components/SelectGameWinnerForm';

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

  const { match, latestGame, players, currentUserId } = data;
  const team1 = latestGame.team_1_members || [];
  const teamA = latestGame.team_a_members || [];
  const isInProgress = latestGame.status === 'In progress';
  const isAuction = latestGame.status === 'Auction pending';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Match #{match.id}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeamCard teamName="Team 1" teamLogo="/Team1.png" players={players} teamMembers={team1} />
        <TeamCard teamName="Team A" teamLogo="/TeamA.png" players={players} teamMembers={teamA} />
      </div>

      <SelectGameWinnerForm gameId={latestGame.id} show={isInProgress} />

      {isAuction && (
        <AuctionPhase latestGame={latestGame} players={players} currentUserId={currentUserId} />
      )}
    </div>
  );
}
