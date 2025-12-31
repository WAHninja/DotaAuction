'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserContext } from '@/app/context/UserContext';
import { useContext } from 'react';
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';
import WinnerBanner from '@/app/components/WinnerBanner';

export default function MatchPage() {
  const { id } = useParams();
  const matchId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useContext(UserContext);

  const [data, setData] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);

  // ------------------ Protect Route ------------------
  useEffect(() => {
    if (!user) {
      router.push('/'); // redirect if not logged in
    }
  }, [user, router]);

  // ------------------ Fetch Data ------------------
  const fetchMatchData = async () => {
    try {
      const res = await fetch(`/api/match/${matchId}`);
      if (!res.ok) throw new Error('Failed to fetch match data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async (gameId: number) => {
    try {
      const res = await fetch(`/api/game/offers?id=${gameId}`);
      if (!res.ok) throw new Error('Failed to fetch offers');
      const json = await res.json();
      setOffers(json.offers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGamesPlayed = async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/games-played`);
      const json = await res.json();
      setGamesPlayed(json.gamesPlayed);
    } catch (err) {
      console.error('Failed to fetch games played', err);
    }
  };

  const fetchGameHistory = async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/history`);
      if (!res.ok) throw new Error('Failed to fetch game history');
      const json = await res.json();
      setHistory(json.history || []);
    } catch (err) {
      console.error('Failed to fetch game history:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMatchData();
      fetchGamesPlayed();
      fetchGameHistory();
    }
  }, [matchId, user]);

  useEffect(() => {
    if (data?.latestGame?.status === 'auction pending') {
      fetchOffers(data.latestGame.id);
    }
  }, [data]);

  useGameWinnerListener(matchId, () => {
    if (user) {
      fetchMatchData();
      fetchGamesPlayed();
      fetchGameHistory();
    }
  });

  useAuctionListener(
    matchId,
    data?.latestGame?.id || null,
    fetchMatchData,
    fetchOffers,
    fetchGamesPlayed,
    fetchGameHistory
  );

  // ------------------ Submit Offer ------------------
  const handleSubmitOffer = async () => {
    if (!data?.latestGame?.id) return;

    const parsedAmount = parseInt(offerAmount, 10);
    const minOfferAmount = 250 + gamesPlayed * 200;
    const maxOfferAmount = 2000 + gamesPlayed * 500;

    if (!selectedPlayer || isNaN(parsedAmount) || parsedAmount < minOfferAmount || parsedAmount > maxOfferAmount) {
      alert(`Please select a player and enter a valid offer (${minOfferAmount}-${maxOfferAmount})`);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/game/${data.latestGame.id}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_player_id: parseInt(selectedPlayer), offer_amount: parsedAmount }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error submitting offer');

      setOfferAmount('');
      setSelectedPlayer('');
      fetchOffers(data.latestGame.id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    if (!data?.latestGame?.id) return;
    setAccepting(true);

    try {
      const res = await fetch(`/api/game/${matchId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      if (!res.ok) throw new Error('Failed to accept offer');

      await fetchOffers(data.latestGame.id);
    } catch (err) {
      console.error(err);
    } finally {
      setAccepting(false);
    }
  };

  // ------------------ Render ------------------
  if (!user) return <div className="p-6 text-center text-gray-300">Redirecting to login...</div>;
  if (loading) return <div className="p-6 text-center text-gray-300">Loading match...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-6 text-center text-gray-300">Match not found.</div>;

  const { match, latestGame, players, currentUserId } = data;
  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];
  const getPlayer = (id: number) => players.find((p: any) => p.id === id);

  const isAuction = latestGame?.status === 'auction pending';
  const isInProgress = latestGame?.status === 'in progress';
  const winningTeam = latestGame?.winning_team;

  return (
    <>
      {latestGame && (
        <MatchHeader
          matchId={matchId}
          latestGame={latestGame}
          matchWinnerId={match.winner_id}
          matchWinnerUsername={players.find((p: any) => p.id === match.winner_id)?.username}
        />
      )}

      {latestGame?.status === 'finished' && (
        <WinnerBanner winnerName={players.find((p: any) => p.id === match.winner_id)?.username} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TeamCard name="Team 1" logo="/Team1.png" players={team1.map(getPlayer)} teamId="team1" color="from-lime-900/40 to-lime-800/40" />
        <TeamCard name="Team A" logo="/TeamA.png" players={teamA.map(getPlayer)} teamId="teamA" color="from-red-900/40 to-red-800/40" />
      </div>

      {isInProgress && <SelectGameWinnerForm gameId={latestGame.id} show={isInProgress} />}

      {isAuction && (
        <div className="bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg mb-8">
          {/* Auction logic here */}
        </div>
      )}

      {/* Game history section can stay as-is */}
    </>
  );
}
