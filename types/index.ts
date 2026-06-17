// types/index.ts

export type TierLabel = 'Low' | 'Medium' | 'High';
export type OfferStatus = 'pending' | 'accepted' | 'rejected';
export type TeamId = 'team_1' | 'team_a';
export type GameStatus = 'in progress' | 'auction pending' | 'finished';
export type ViewerState = 'winner' | 'loser' | 'spectator';

// How a match was won.
//   last_standing   — original condition: one player left on their team wins a game
//   gold_threshold  — new condition: a player accumulates ≥ 100,000 gold
export type WinType = 'last_standing' | 'gold_threshold';

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
  phase?: string | null;
};

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
  win_type: WinType | null;
  game_id?: number;
  created_at?: string;
};

export type DashboardMatch = {
  id: number;
  winner_id?: number;
  winner_username?: string;
  win_type?: WinType | null;
  team_a_usernames?: string[];
  team_1_usernames?: string[];
  games_count?: number;
};

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
  reason: 'win_reward' | 'loss_penalty' | 'offer_gain' | string;
};

export type DotaGameStat = {
  playerId: number;
  username: string;
  hero: string | null;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
  team: TeamId;
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
  dotaStats: DotaGameStat[];
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
  gamesPlayed: number;
  winRate: number;
};

export type SortKey =
  | 'username'
  | 'gamesWinRate'
  | 'offerAcceptRate'
  | 'averageOfferValue'
  | 'timesOffered'
  | 'timesSold';

export type AcquisitionImpact = {
  username: string;
  totalAcquisitions: number;
  winsAfterAcquisition: number;
  winRate: number;
};

export type WinStreak = {
  username: string;
  longestStreak: number;
  matchId: number;
};

export type HeadToHead = {
  playerAId: number;
  playerA: string;
  playerBId: number;
  playerB: string;
  totalGames: number;
  playerAWins: number;
  playerBWins: number;
};

// Win type breakdown for a player across all their match wins
export type WinTypeStats = {
  username: string;
  lastStandingWins: number;
  goldThresholdWins: number;
  totalWins: number;
};

// ---------------------------------------------------------------------------
// Hall of Fame
// ---------------------------------------------------------------------------

export type HallOfFameEntry = {
  holder: string;
  stat: string;
  context?: string;
};

export type HallOfFameRecord = HallOfFameEntry[] | null;

export type HallOfFameProps = {
  mostMatchWins: HallOfFameRecord;
  fewestGamesToWin: HallOfFameRecord;
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
};
