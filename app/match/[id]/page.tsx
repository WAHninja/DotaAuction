'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import MobileNavToggle from '../../components/MobileNavToggle';
import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';
import { GameHistoryCard } from '@/app/components/GameHistoryCard'

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
    if (data?.latestGame?.status === 'auction pending') {
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

  const isInProgress = latestGame?.status === 'in progress';
  const isAuction = latestGame?.status === 'auction pending';
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

  useEffect(() => {
  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/history`);
      const result = await res.json();
      setGameHistory(result.history || []);
    } catch (err) {
      console.error('Failed to fetch game history:', err);
    }
  };

  fetchHistory();
}, [matchId]);

  return (
  <>
    <MatchHeader matchId={match.id} latestGame={latestGame} />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <TeamCard
        name="Team 1"
        logo="/Team1.png"
        players={team1.map(getPlayer)}
        teamId="team1"
        color="from-lime-900/40 to-lime-800/40"
      />
      <TeamCard
        name="Team A"
        logo="/TeamA.png"
        players={teamA.map(getPlayer)}
        teamId="teamA"
        color="from-red-900/40 to-red-800/40"
      />
    </div>

    {isInProgress && (
      <div className="mb-8">
        <SelectGameWinnerForm gameId={latestGame.id} show={isInProgress} />
      </div>
    )}

    {/* Auction Phase */}
{isAuction && (
  <div className="bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg mb-8">
    <h3 className="text-2xl font-bold mb-4 text-center">Auction Phase</h3>

    {/* Flex container for the entire auction phase */}
    <div className="flex flex-col gap-6 items-start">

      {/* Offer form for winners */}
      {isWinner && !alreadySubmittedOffer ? (
        <div className="w-full max-w-md mx-auto mb-6">
          <p className="font-semibold mb-2 text-center md:text-left">Make an Offer:</p>
          <div className="flex flex-col md:flex-row items-center gap-4 justify-center md:justify-start">
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="px-3 py-2 rounded-lg text-black w-full max-w-xs"
            >
              <option value="">Select Player</option>
              {offerCandidates.map((pid) => {
                const player = getPlayer(pid);
                return (
                  <option key={pid} value={pid}>
                    {player?.username || 'Unknown'}
                  </option>
                );
              })}
            </select>

            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="Offer Amount (250-2000)"
              className="px-3 py-2 rounded-lg text-black w-full max-w-xs"
            />

            <button
              onClick={handleSubmitOffer}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full max-w-xs mt-4 md:mt-0"
            >
              {submitting ? 'Submitting...' : 'Submit Offer'}
            </button>
          </div>
        </div>
      ) : isWinner && alreadySubmittedOffer && (
        <div className="mb-6 text-center text-yellow-300 font-semibold">
          ✅ You've already submitted your offer.
        </div>
      )}

      {/* Shopkeeper + Offers layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* Shopkeeper Image */}
        <div className="hidden md:block relative -ml-20 -mt-[100px] z-10 overflow-visible w-fit">
          <Image
            src="/Shopkeeper.png"
            alt="Shopkeeper"
            width={300}
            height={450}
            className="rounded-xl max-w-[300px]"
          />
        </div>

        {/* Current Offers */}
        <div className="flex-1">
          <h4 className="text-xl font-bold mb-4">Current Offers</h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => {
              const from = getPlayer(offer.from_player_id);
              const to = getPlayer(offer.target_player_id);
              const canAccept = isLoser && offer.status === 'pending' && !alreadyAcceptedOffer;

              return (
                <div
                  key={offer.id}
                  className="bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700 flex flex-col justify-between h-full"
                >
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex gap-2">
                      <span className="text-lg text-gray-300">From</span>
                      <span className="text-lg font-semibold text-yellow-300">{from?.username}</span>
                    </div>

                    <div className="mt-2 text-sm text-gray-300">
                      If accepted:
                      <ul className="list-disc list-inside text-gray-300 mt-1">
                        <li>
                          <strong>{from?.username}</strong> gains{' '}
                          <span className="text-yellow-400 font-bold">{offer.offer_amount}</span>{' '}
                          <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block mr-2" />
                          starting gold
                        </li>
                        <li>
                          <strong>{to?.username}</strong> moves to the <span className="text-red-400 font-bold">losing team</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {canAccept ? (
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={accepting}
                      className="mt-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                      {accepting ? 'Accepting...' : 'Accept Offer'}
                    </button>
                  ) : (
                    <div className="mt-auto text-sm text-gray-400 italic">
                      {offer.status === 'accepted'
                        ? 'Accepted'
                        : offer.status === 'rejected'
                        ? 'Rejected'
                        : 'Waiting for response'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div> {/* End of Shopkeeper + Offers row */}
      <div className="space-y-6">
  {gameHistory.length > 0 && (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">Game History</h2>
      {gameHistory.map((game: any, index: number) => (
        <GameHistoryCard
          key={game.id}
          game={{ ...game, number: index + 1 }}
          players={players}
        />
      ))}
    </div>
  )}
</div>

    </div>
  </div>
)}
  </>
);
}
