// types/index.ts
//
// Single source of truth for all shared types across the application.
// API routes, components, and hooks should import from here rather than
// redefining their own local versions.

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

export type TierLabel = 'Low' | 'Medium' | 'High';

export type OfferStatus = 'pending' | 'accepted' | 'rejected';

export type TeamId = 'team_1' | 'team_a';

export type GameStatus = 'in progress' | 'auction pending' | 'finished';

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export type Player = {
  id: number;
  username: string;
  gold: number;
  steam_avatar?: string | null;
};

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

/** Offer as returned by the API — offer_amount is null while pending */
export type Offer = {
  id: number;
  game_id: number;
  from_player_id: number;
  target_player_id: number;
  offer_amount?: number | null;
  tier_label: TierLabel | null;
  status: OfferStatus;
  created_at?: string;
};

/** Offer as it appears in game history (includes denormalised usernames) */
export type HistoryOffer = {
  id: number;
  gameId: number;
  fromPlayerId: number;
  targetPlayerId: number;
  offerAmount: number | null;
  tierLabel: TierLabel | null;
  status: OfferStatus;
  createdAt: string;
  fromUsername: string;
  targetUsername: string;
};

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

export type Game = {
  id: number;
  match_id: number;
  status: GameStatus;
  winning_team: TeamId | null;
  team_1_members: number[];
  team_a_members: number[];
  created_at?: string;
};

/** Lightweight version used in MatchHeader (gameNumber added client-side) */
export type GameSummary = {
  id: number;
  gameNumber?: number;
  status: GameStatus;
  winning_team?: TeamId;
};

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export type Match = {
  id: number;
  winner_id: number | null;
  game_id?: number;
  created_at?: string;
};

/** Match as returned by the dashboard queries (includes denormalised data) */
export type DashboardMatch = {
  id: number;
  winner_id?: number;
  winner_username?: string;
  team_a_usernames?: string[];
  team_1_usernames?: string[];
};

/** Full match data as returned by /api/match/[id] */
export type MatchData = {
  match: Match;
  players: Player[];
  games: Game[];
  latestGame: Game | null;
  offers: Offer[];
  currentUserId: number;
};

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export type HistoryPlayerStat = {
  id?: number;
  playerId: number;
  username: string;
  goldChange: number;
  reason: 'win_reward' | 'loss_penalty' | 'offer_gain' | 'offer_accepted' | string;
};

export type HistoryGame = {
  gameNumber: number;
  gameId: number;
  matchId: number;
  createdAt: string;
  status: GameStatus;
  winningTeam: TeamId | null;
  teamAMembers: string[];
  team1Members: string[];
  offers: HistoryOffer[];
  playerStats: HistoryPlayerStat[];
};

// ---------------------------------------------------------------------------
// Stats — leaderboard
// ---------------------------------------------------------------------------

export type PlayerStats = {
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  timesOffered: number;
  timesSold: number;
  offersMade: number;
  offersAccepted: number;
  averageOfferValue: number;
  netGold: number;
};

export type TeamCombo = {
  combo: string;
  wins: number;
  gamesPlayed: number;
  winRate: number;
};

export type SortKey =
  | 'username'
  | 'gamesWinRate'
  | 'offerAcceptRate'
  | 'averageOfferValue'
  | 'timesSold'
  | 'netGold';

// ---------------------------------------------------------------------------
// Stats — new metrics
// ---------------------------------------------------------------------------

/**
 * How often a player's new team wins the game immediately after they are
 * acquired via an accepted offer. Only computed for players with ≥ 2
 * acquisitions — smaller samples are too noisy.
 */
export type AcquisitionImpact = {
  username: string;
  totalAcquisitions: number;
  winsAfterAcquisition: number;
  /** Pre-computed percentage, rounded to 1 decimal place. */
  winRate: number;
};

/**
 * Longest consecutive win streak a player has recorded within a single
 * match. matchId included so the UI can reference the specific match.
 * Only includes streaks of length ≥ 2.
 */
export type WinStreak = {
  username: string;
  longestStreak: number;
  matchId: number;
};

/**
 * Head-to-head record between two players who have appeared on opposing
 * teams at least once. Pairs are canonicalised so the player with the
 * lower numeric id is always playerA. Normalise to a given player's
 * perspective on the frontend by checking which side they're on.
 */
export type HeadToHead = {
  playerAId: number;
  playerA: string;
  playerBId: number;
  playerB: string;
  totalGames: number;
  playerAWins: number;
  playerBWins: number;
};

// ---------------------------------------------------------------------------
// Hall of Fame
// ---------------------------------------------------------------------------

export type HallOfFameEntry = {
  holder: string;
  stat: string;
};

export type HallOfFameRecord = HallOfFameEntry[] | null;

export type HallOfFameProps = {
  mostMatchWins: HallOfFameRecord;
  fewestGamesToWin: HallOfFameRecord;
  /** Won with the largest gold deficit relative to the opposing team's total. */
  biggestGoldUnderdog: HallOfFameRecord;
  biggestUnderdogWin: HallOfFameRecord;
};

// ---------------------------------------------------------------------------
// Realtime event payloads
// ---------------------------------------------------------------------------

export type NewOfferPayload = Omit<Offer, 'offer_amount'>;

export type OfferAcceptedPayload = {
  acceptedOfferId: number;
  acceptedAmount: number;
  newGame: Game;
};
