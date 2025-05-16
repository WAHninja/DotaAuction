'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';
import Image from 'next/image';

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
  const [gamesPlayed, setGamesPlayed] = useState<number>(0);
  const [maxOfferAmount, setMaxOfferAmount] = useState(2000);

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

  // Initial fetch
  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  // Fetch offers if auction phase
  useEffect(() => {
    if (data?.latestGame?.status === 'auction pending') {
      fetchOffers(data.latestGame.id);
    }
  }, [data]);

  // Real-time updates
  useGameWinnerListener(matchId, fetchMatchData);
  useAuctionListener(
    matchId,
    data?.latestGame?.id || null,
    fetchMatchData,
    fetchOffers
  );

  // Only render content after loading/data fetch
  if (loading) return <div className="p-6 text-center text-gray-300">Loading match...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-6 text-center text-gray-300">Match not found.</div>;

  // Extract from data AFTER it's ready
  const { match, latestGame, players, currentUserId } = data;
  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];
  const getPlayer = (id: number) => players.find((p: any) => p.id === id);

  const isAuction = latestGame?.status === 'auction pending';
  const isInProgress = latestGame?.status === 'in progress';
  const winningTeam = latestGame?.winning_team;

  const isWinner = winningTeam === 'team_1'
    ? team1.includes(currentUserId)
    : teamA.includes(currentUserId);
  const isLoser = !isWinner;

  const myTeam = isWinner ? (winningTeam === 'team_1' ? team1 : teamA) : [];
  const offerCandidates = myTeam.filter((id) => id !== currentUserId);
  const alreadySubmittedOffer = offers.some(o => o.from_player_id === currentUserId);
  const alreadyAcceptedOffer = offers.find(o => o.status === 'accepted' && o.target_player_id === currentUserId);
  const allOffersSubmitted = myTeam.every(pid => offers.some(o => o.from_player_id === pid));
  const minOfferAmount = 250 + gamesPlayed * 200;

  const fetchGamesAndCalculateOfferLimit = async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/games-played`);
      const json = await res.json();
      const played = json.gamesPlayed || 0;
      setGamesPlayed(played);

      if (isAuction && isWinner && !alreadySubmittedOffer) {
        const calculatedMax = Math.max(2000 - played * 100, 250);
        setMaxOfferAmount(calculatedMax);
      }
    } catch (err) {
      console.error('Error fetching games played:', err);
    }
  };

  useEffect(() => {
    fetchGamesAndCalculateOfferLimit();
  }, [matchId, isAuction, isWinner, alreadySubmittedOffer]);

  const handleSubmitOffer = async () => {
    const parsedAmount = parseInt(offerAmount, 10);
    if (
      !selectedPlayer ||
      isNaN(parsedAmount) ||
      parsedAmount < minOfferAmount ||
      parsedAmount > maxOfferAmount
    ) {
      setMessage(
        `Please select a player and enter a valid offer (${minOfferAmount}–${maxOfferAmount}).`
      );
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const gameId = latestGame?.id;
      if (!gameId) throw new Error('Game ID missing');

      const res = await fetch(`/api/game/${gameId}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_player_id: parseInt(selectedPlayer),
          offer_amount: parsedAmount,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error submitting offer');

      setMessage('Offer submitted!');
      setOfferAmount('');
      setSelectedPlayer('');
      fetchOffers(gameId);
    } catch (err: any) {
      setMessage(err.message || 'Error submitting offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/game/${matchId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      if (!res.ok) throw new Error('Failed to accept offer');
      await fetchOffers(latestGame.id);
    } catch (err) {
      console.error(err);
    } finally {
      setAccepting(false);
    }
  };
  
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
    <h3 className="text-2xl font-bold mb-4 text-center">Auction House</h3>

    {/* Flex container for the entire auction phase */}
    <div className="flex flex-col gap-6 items-start">

      {/* Offer form for winners */}
      {isWinner && !alreadySubmittedOffer ? (
  <div className="w-full max-w-md mx-auto mb-6">
    <p className="font-semibold mb-2 text-center md:text-left">Make an Offer:</p>

    <div className="text-sm text-gray-300 text-center md:text-left mb-2">
      Offer must be between <span className="font-semibold text-white">250</span> and <span className="font-semibold text-white">{maxOfferAmount}</span> gold.
    </div>

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
        placeholder={`250 - ${maxOfferAmount}`}
        min={250}
        max={maxOfferAmount}
        className="px-3 py-2 rounded-lg text-black w-full max-w-xs"
      />
    </div>

    {/* Validation Message */}
    {offerAmount !== '' && (Number(offerAmount) < 250 || Number(offerAmount) > maxOfferAmount) && (
      <div className="mt-2 text-red-400 text-sm text-center md:text-left">
        Offer must be between 250 and {maxOfferAmount}.
      </div>
    )}

    <div className="mt-4 flex justify-center md:justify-start">
      <button
        onClick={handleSubmitOffer}
        disabled={
          submitting ||
          !selectedPlayer ||
          !offerAmount ||
          Number(offerAmount) < 250 ||
          Number(offerAmount) > maxOfferAmount
        }
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full max-w-xs"
      >
        {submitting ? 'Submitting...' : 'Submit Offer'}
      </button>
    </div>
  </div>
) : isWinner && alreadySubmittedOffer && (
  <div className="w-full max-w-md mx-auto mb-6">
    <div className="mb-6 text-center text-yellow-300 font-semibold">
      ✅ You've already submitted your offer.
    </div>
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
              const canAccept =
                isLoser &&
                offer.status === 'pending' &&
                !alreadyAcceptedOffer &&
                allOffersSubmitted;

              return (
    <div
  key={offer.id}
  className="bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700 flex flex-col justify-between h-full"
>
  {!allOffersSubmitted ? (
    <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <span className="text-lg text-gray-300">From</span>
          <span className="text-lg font-semibold text-yellow-300">{from?.username}</span>
        </div>
        <div className="mt-2 text-sm text-gray-300">
          Waiting for all offers.
        </div>
      </div>
  ) : (
    <>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <span className="text-lg text-gray-300">From</span>
          <span className="text-lg font-semibold text-yellow-300">{from?.username}</span>
        </div>

        <div className="mt-2 text-sm text-gray-300">
          If accepted:
          <ul className="list-disc list-inside text-gray-300 mt-1">
            <li className="whitespace-nowrap">
              <strong>{from?.username}</strong> gains{' '}
              <span className="text-yellow-400 font-bold">{offer.offer_amount}</span>{' '}
              <Image
                src="/Gold_symbol.webp"
                alt="Gold"
                width={16}
                height={16}
                className="inline-block mr-2"
              />
              starting gold
            </li>
            <li className="whitespace-nowrap">
              <strong>{to?.username}</strong> moves to the{' '}
              <span className="text-red-400 font-bold">losing team</span>
            </li>
          </ul>
        </div>
      </div>

      {canAccept && (
        <button
          onClick={() => handleAcceptOffer(offer.id)}
          disabled={accepting}
          className="mt-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          {accepting ? 'Accepting...' : 'Accept Offer'}
        </button>
      )}
    </>
  )}
</div>
  );
})}
          </div>
        </div>

      </div> {/* End of Shopkeeper + Offers row */}
      </div>
  </div>
)}
  </>
);
}
