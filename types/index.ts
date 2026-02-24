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
  offer_amount?: number | null;  // null while status === 'pending', absent in Ably payloads
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
  offerAmount: number | null;   // null while status === 'pending'
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
// Stats
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
};

export type SortKey =
  | 'username'
  | 'gamesWinRate'
  | 'offerAcceptRate'
  | 'averageOfferValue'
  | 'timesSold'
  | 'netGold';

// ---------------------------------------------------------------------------
// Hall of Fame
// ---------------------------------------------------------------------------

/** A single ranked entry in a Hall of Fame record. */
export type HallOfFameEntry = {
  holder: string;
  stat: string;
};

/**
 * Up to three ranked entries, or null when no data exists yet.
 * Null renders a placeholder skeleton rather than an empty list.
 */
export type HallOfFameRecord = HallOfFameEntry[] | null;

export type HallOfFameProps = {
  mostMatchWins: HallOfFameRecord;
  fewestGamesToWin: HallOfFameRecord;
  /** Won with the largest gold deficit relative to the opposing team's total. */
  biggestGoldUnderdog: HallOfFameRecord;
  biggestUnderdogWin: HallOfFameRecord;
};

// ---------------------------------------------------------------------------
// Ably event payloads
// ---------------------------------------------------------------------------

export type NewOfferPayload = Omit<Offer, 'offer_amount'>;

export type OfferAcceptedPayload = {
  acceptedOfferId: number;
  acceptedAmount: number;
  newGame: Game;
};
