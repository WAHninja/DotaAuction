'use client';

import { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import WinnerBanner from '@/app/components/WinnerBanner';
import AuctionHouse from '@/app/components/AuctionHouse';
import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';
import GameHistory from '@/app/components/GameHistory';
import type { MatchData, Offer, HistoryGame, OfferAcceptedPayload, NewOfferPayload } from '@/types';

export default function MatchPage() {
  const { id } = useParams();
  const matchId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useContext(UserContext);

  const [data, setData] = useState<MatchData | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryGame[]>([]);

  // ---- Protect route -------------------------------------------------------
  // Wait until the session check has finished before redirecting.
  // Without the loading guard, user is null on every first render (including
  // a hard refresh) and the page redirects before auth has a chance to resolve.
  const { loading: authLoading } = useContext(UserContext);
  useEffect(() => {
    if (!authLoading && user === null) router.push('/');
  }, [authLoading, user, router]);

  // ---- Data fetchers -------------------------------------------------------
  const fetchMatchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${matchId}`);
      if (!res.ok) throw new Error('Failed to fetch match data');
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const fetchOffers = useCallback(async (gameId: number) => {
    try {
      const res = await fetch(`/api/game/offers?id=${gameId}`);
      if (!res.ok) throw new Error('Failed to fetch offers');
      const json = await res.json();
      setOffers(json.offers || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // gamesPlayed is derived from data.games.length — no separate fetch needed.

  const fetchGameHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/history`);
      if (!res.ok) throw new Error('Failed to fetch game history');
      const json = await res.json();
      setHistory(json.history || []);
    } catch (err) {
      console.error('Failed to fetch game history:', err);
    }
  }, [matchId]);

  // ---- Ably state updaters -------------------------------------------------
  // Rather than refetching all offers on every Ably event, we update local
  // state directly from the event payload — eliminating N round trips during
  // the offer submission phase (one per player on the winning team).

  const handleNewOffer = useCallback((offer: NewOfferPayload) => {
    // Append the new offer directly — no fetch needed. The payload already
    // contains all fields (id, from/target player ids, tier_label, status)
    // with offer_amount intentionally stripped server-side while pending.
    // Explicitly set offer_amount: null so the entry is a complete Offer
    // and consistent with offers returned by the API.
    setOffers(prev =>
      prev.some(o => o.id === offer.id)
        ? prev
        : [...prev, { ...offer, offer_amount: null }]
    );
  }, []);

  const handleOfferAccepted = useCallback((payload: OfferAcceptedPayload) => {
    // Update offer states directly from the event rather than refetching:
    // - The accepted offer gets its real amount revealed
    // - All remaining pending offers become rejected
    setOffers(prev => prev.map(o => {
      if (o.id === payload.acceptedOfferId) {
        return { ...o, status: 'accepted', offer_amount: payload.acceptedAmount };
      }
      if (o.status === 'pending') {
        return { ...o, status: 'rejected' };
      }
      return o;
    }));
    // Match data and history still need a fetch — gold balances changed,
    // teams have swapped, and a new game was created server-side.
    Promise.all([fetchMatchData(), fetchGameHistory()]);
  }, [fetchMatchData, fetchGameHistory]);

  // ---- Initial load --------------------------------------------------------
  // Run both fetches in parallel — matchData and history are independent
  // and neither needs to wait for the other to complete.
  useEffect(() => {
    if (!user) return;
    Promise.all([fetchMatchData(), fetchGameHistory()]);
  }, [matchId, user, fetchMatchData, fetchGameHistory]);

  useEffect(() => {
    if (data?.latestGame?.status === 'auction pending') {
      fetchOffers(data.latestGame.id);
    }
  }, [data, fetchOffers]);

  // ---- Real-time listeners -------------------------------------------------
  const handleWinnerSelected = useCallback(() => {
    Promise.all([fetchMatchData(), fetchGameHistory()]);
  }, [fetchMatchData, fetchGameHistory]);

  useGameWinnerListener(matchId, handleWinnerSelected);

  useAuctionListener(
    matchId,
    data?.latestGame?.id ?? null,
    handleNewOffer,
    handleOfferAccepted,
  );

  // ---- Render guards -------------------------------------------------------
  if (!user && authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-3 font-barlow text-dota-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          Redirecting…
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-dota-gold" />
          <span className="font-cinzel text-lg font-bold text-dota-text-muted">Loading match…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="panel p-8 flex flex-col items-center gap-4 max-w-sm text-center border-dota-dire/40">
          <AlertCircle className="w-10 h-10 text-dota-dire-light" />
          <p className="font-cinzel text-lg font-bold text-dota-text">Something went wrong</p>
          <p className="font-barlow text-sm text-dota-text-muted">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchMatchData(); }}
            className="btn-secondary"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="panel p-8 flex flex-col items-center gap-3 max-w-sm text-center">
          <p className="font-cinzel text-lg font-bold text-dota-text">Match not found</p>
          <p className="font-barlow text-sm text-dota-text-muted">This match may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const { match, latestGame, players, currentUserId } = data;
  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];
  const getPlayer = (id: number) => players.find((p) => p.id === id);

  const isAuction    = latestGame?.status === 'auction pending';
  const isInProgress = latestGame?.status === 'in progress';
  const isFinished   = latestGame?.status === 'finished';

  return (
    <>
      {latestGame && (
        <MatchHeader
          matchId={matchId}
          latestGame={latestGame}
          matchWinnerId={match.winner_id}
          matchWinnerUsername={players.find((p) => p.id === match.winner_id)?.username}
        />
      )}

      {isFinished && match.winner_id && (
        <WinnerBanner
          winnerName={players.find((p) => p.id === match.winner_id)?.username}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TeamCard
          name="Team 1"
          logo="/Team1.png"
          players={team1.map(getPlayer).filter(Boolean)}
          teamId="team1"
          faction="radiant"
          currentUserId={currentUserId}
        />
        <TeamCard
          name="Team A"
          logo="/TeamA.png"
          players={teamA.map(getPlayer).filter(Boolean)}
          teamId="teamA"
          faction="dire"
          currentUserId={currentUserId}
        />
      </div>

      {isInProgress && (
        <SelectGameWinnerForm gameId={latestGame.id} show />
      )}

      {isAuction && latestGame.winning_team && (
        <AuctionHouse
          matchId={matchId}
          latestGame={latestGame}
          players={players}
          currentUserId={currentUserId}
          offers={offers}
          gamesPlayed={data.games.length}
          onOfferSubmitted={handleNewOffer}
          onOfferAccepted={() => {
            Promise.all([fetchMatchData(), fetchGameHistory()]);
          }}
        />
      )}

      <GameHistory history={history} />
    </>
  );
}
