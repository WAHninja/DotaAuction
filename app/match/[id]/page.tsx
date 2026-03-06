'use client';

import { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import WinnerBanner from '@/app/components/WinnerBanner';
import type { ViewerState } from '@/app/components/WinnerBanner';
import AuctionHouse from '@/app/components/AuctionHouse';
import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';
import { useGameReportedListener } from '@/app/hooks/useGameReportedListener';
import GameHistory from '@/app/components/GameHistory';
import type { MatchData, Offer, HistoryGame, OfferAcceptedPayload, NewOfferPayload } from '@/types';

// ---------------------------------------------------------------------------
// Stat computation helpers
// ---------------------------------------------------------------------------

/**
 * Count how many games a player (by username) won and lost across the match.
 * History uses string usernames for team member lists.
 */
function computeRecord(
  username: string | undefined,
  history: HistoryGame[]
): { wins: number; losses: number } | undefined {
  if (!username) return undefined;

  let wins = 0;
  let losses = 0;

  for (const game of history) {
    // Only count finished games — in-progress/auction-pending games have no result yet
    if (game.status !== 'finished') continue;
    if (!game.winningTeam) continue;

    const inTeam1 = game.team1Members.includes(username);
    const inTeamA = game.teamAMembers.includes(username);

    if (!inTeam1 && !inTeamA) continue; // player wasn't in this game

    const playerWon =
      (game.winningTeam === 'team_1' && inTeam1) ||
      (game.winningTeam === 'team_a' && inTeamA);

    if (playerWon) wins++;
    else losses++;
  }

  return { wins, losses };
}

/**
 * Count how many times a player was the target of an accepted offer
 * (i.e. sold to the other team) across the match.
 */
function computeTimesTraded(
  username: string | undefined,
  history: HistoryGame[]
): number {
  if (!username) return 0;

  let count = 0;
  for (const game of history) {
    for (const offer of game.offers) {
      if (offer.status === 'accepted' && offer.targetUsername === username) {
        count++;
      }
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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

  // ---- Realtime state updaters ---------------------------------------------
  const handleNewOffer = useCallback((offer: NewOfferPayload) => {
    setOffers(prev =>
      prev.some(o => o.id === offer.id)
        ? prev
        : [...prev, { ...offer, offer_amount: null }]
    );
  }, []);

  const handleOfferAccepted = useCallback((payload: OfferAcceptedPayload) => {
    setOffers(prev => prev.map(o => {
      if (o.id === payload.acceptedOfferId) {
        return { ...o, status: 'accepted', offer_amount: payload.acceptedAmount };
      }
      if (o.status === 'pending') {
        return { ...o, status: 'rejected' };
      }
      return o;
    }));
    Promise.all([fetchMatchData(), fetchGameHistory()]);
  }, [fetchMatchData, fetchGameHistory]);

  const handleGameReported = useCallback(() => {
    Promise.all([fetchMatchData(), fetchGameHistory()]);
  }, [fetchMatchData, fetchGameHistory]);

  // ---- Initial load --------------------------------------------------------
  useEffect(() => {
    if (!user) return;
    Promise.all([fetchMatchData(), fetchGameHistory()]);
  }, [matchId, user, fetchMatchData, fetchGameHistory]);

  useEffect(() => {
    if (data?.latestGame?.status === 'auction pending') {
      fetchOffers(data.latestGame.id);
    }
  }, [data, fetchOffers]);

  // ---- Realtime listeners --------------------------------------------------
  const handleWinnerSelected = useCallback(() => {
    Promise.all([fetchMatchData(), fetchGameHistory()]);
  }, [fetchMatchData, fetchGameHistory]);

  useGameWinnerListener(matchId, handleWinnerSelected);
  useGameReportedListener(matchId, handleGameReported);
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

  const winnerName = match.winner_id
    ? players.find((p) => p.id === match.winner_id)?.username
    : undefined;

  // ---- Winner banner props -------------------------------------------------
  //
  // viewerState: determines which banner variant renders.
  //   • 'winner'    — the current user is the match winner
  //   • 'loser'     — the current user was a participant but didn't win
  //   • 'spectator' — the current user is not in the player list at all
  //
  // Spectators are valid: /match/[id] has no membership requirement (any
  // authenticated user can view any match). The banner must not show
  // "Defeated" or personal stats to someone who wasn't playing.
  const isParticipant = players.some(p => p.id === currentUserId);
  const viewerState: ViewerState =
    !isParticipant            ? 'spectator' :
    currentUserId === match.winner_id ? 'winner'    :
                                        'loser';

  const viewerUsername = players.find(p => p.id === currentUserId)?.username;

  // Compute personal record and traded count from history.
  // These are only meaningful once history has loaded — the banner
  // handles undefined gracefully by simply not rendering that stat.
  const winnerRecord      = computeRecord(winnerName, history);
  const viewerRecord      = viewerState === 'loser'
    ? computeRecord(viewerUsername, history)
    : undefined;
  const winnerTimesTraded = computeTimesTraded(winnerName, history);

  return (
    <>
      {latestGame && (
        <MatchHeader
          matchId={matchId}
          latestGame={latestGame}
          matchWinnerId={match.winner_id}
          matchWinnerUsername={winnerName}
        />
      )}

      {isFinished && match.winner_id && (
        <WinnerBanner
          winnerName={winnerName}
          viewerState={viewerState}
          totalGames={history.length}
          matchCreatedAt={match.created_at}
          winnerRecord={winnerRecord}
          viewerRecord={viewerRecord}
          winnerTimesTraded={winnerTimesTraded}
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
          matchFinished={isFinished}
        />
        <TeamCard
          name="Team A"
          logo="/TeamA.png"
          players={teamA.map(getPlayer).filter(Boolean)}
          teamId="teamA"
          faction="dire"
          currentUserId={currentUserId}
          matchFinished={isFinished}
        />
      </div>

      {isInProgress && (
        <SelectGameWinnerForm gameId={latestGame.id} show />
      )}

      {isAuction && latestGame.winning_team && (
        <AuctionHouse
          latestGame={latestGame}
          players={players}
          currentUserId={currentUserId}
          offers={offers}
          completedGames={data.games.length - 1}
          onOfferSubmitted={handleNewOffer}
          onOfferAccepted={() => {
            Promise.all([fetchMatchData(), fetchGameHistory()]);
          }}
        />
      )}

      <GameHistory
        history={history}
        matchFinished={isFinished}
      />
    </>
  );
}
