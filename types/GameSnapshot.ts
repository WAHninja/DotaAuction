// types/GameSnapshot.ts
export type GamePhase =
  | 'in_progress'
  | 'auction'
  | 'completed';

export interface OfferSnapshot {
  id: number;
  from_user_id: number;
  to_user_id: number;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface GameSnapshot {
  matchId: number;
  gameId: number;
  gameNumber: number;

  phase: GamePhase;
  winningTeam: 'team1' | 'teamA' | null;

  team1: number[];
  teamA: number[];

  offers: OfferSnapshot[];

  createdAt: string;
}
