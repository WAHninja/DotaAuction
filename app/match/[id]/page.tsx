'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import SelectGameWinnerForm from '../../components/SelectGameWinnerForm';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import AuctionSection from '@/app/components/AuctionSection';
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm';
import MobileNavToggle from '../../components/MobileNavToggle';
import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';

export default function MatchPage() {
  const { id } = useParams();
  const matchId = Array.isArray(id) ? id[0] : id;
  const [data, setData] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchMatchData = async () => {
    setLoading(true);
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

  const fetchOffers = async (gameId: number) => {
    try {
      const res = await fetch(`/api/game/offers?id=${gameId}`);
      if (!res.ok) throw new Error('Failed to fetch offers');
      const result = await res.json();
      setOffers(result.offers || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMatchData();
  }, [id]);

  useEffect(() => {
    if (data?.latestGame?.status === 'Auction pending') {
      fetchOffers(data.latestGame.id);
    }
  }, [data]);

   useGameWinnerListener(matchId, () => {
  fetchMatchData();
});

  useAuctionListener(
    matchId,
    data?.latestGame?.id || null,
    fetchMatchData,
    fetchOffers
  );

  const handleSubmitOffer = async () => {
    const parsedAmount = parseInt(offerAmount, 10);

    if (!selectedPlayer || isNaN(parsedAmount) || parsedAmount < 250 || parsedAmount > 2000) {
      setMessage('Please select a player and enter a valid offer amount between 250 and 2000.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const gameId = data?.latestGame?.id;
      if (!gameId) {
        setMessage('Game ID is missing');
        return;
      }

      const res = await fetch(`/api/game/${gameId}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_player_id: parseInt(selectedPlayer, 10),
          offer_amount: parsedAmount,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Offer submitted!');
        setOfferAmount('');
        setSelectedPlayer('');
        fetchOffers(gameId); // refresh offers list
      } else {
        setMessage(result.error || 'Something went wrong.');
      }
    } catch (err) {
      console.error('Error submitting offer:', err);
      setMessage('Error submitting offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/game/${id}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      if (!res.ok) throw new Error('Failed to accept offer');
      await fetchOffers(data.latestGame.id); // Refresh offers
    } catch (err) {
      console.error(err);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-300">Loading match...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-6 text-center text-gray-300">Match not found.</div>;

  const { match, latestGame, players, currentUserId } = data;
  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];

  const getPlayer = (pid: number) => players.find((p: any) => p.id === pid);

  const isInProgress = latestGame?.status === 'In progress';
  const isAuction = latestGame?.status === 'Auction pending';
  const winningTeam = latestGame?.winning_team;

  const isWinner = winningTeam === 'team_1' ? team1.includes(currentUserId) : teamA.includes(currentUserId);
  const isLoser = !isWinner;

  const myTeam = winningTeam === 'team_1' ? team1 : teamA;
  const offerCandidates = myTeam.filter((pid) => pid !== currentUserId);

  const alreadySubmittedOffer = offers.some(
    (offer) => offer.from_player_id === currentUserId
  );
  
  const alreadyAcceptedOffer = offers?.find(
    (o) => o.status === 'accepted' && o.target_player_id === currentUserId
  );

  return (
  <>
    <MatchHeader matchId={match.id} latestGame={latestGame} />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <TeamCard
        name="Team 1"
        logo="/Team1.png"
        players={team1.map(getPlayer)}
        teamId="team1"
      />
      <TeamCard
        name="Team A"
        logo="/TeamA.png"
        players={teamA.map(getPlayer)}
        teamId="teamA"
      />
    </div>

    {isInProgress && (
      <div className="mb-8">
        <SelectGameWinnerForm gameId={latestGame.id} show={isInProgress} />
      </div>
    )}

    {isAuction && (
      <AuctionSection
        currentUserId={currentUserId}
        gameId={latestGame.id}
        players={players}
        winningTeam={winningTeam === 'team_1' ? team1 : teamA}
        offers={offers}
        onSubmitOffer={handleSubmitOffer}
        onAcceptOffer={handleAcceptOffer}
        isSubmitting={submitting}
        isAccepting={accepting}
        message={message}
      />
    )}
  </>
);
