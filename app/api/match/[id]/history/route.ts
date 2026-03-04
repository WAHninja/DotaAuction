// Destination: app/api/match/[id]/history/route.ts
//
// Returns the full game-by-game history for a match.
//
// Security:
//   • Auth checked first — no session → 401
//   • Membership checked via the users query result — non-participant or
//     non-existent match → 404. We use 404 rather than 403 because this
//     endpoint is fetched silently in the background by MatchPage; there's
//     no user-typed URL so there's no value in distinguishing "match doesn't
//     exist" from "you're not in it".
//
// Query strategy — 3 queries total regardless of match length:
//   1. All match participants → username lookup map + membership check in JS
//      (eliminates the separate membership round-trip; a non-existent match
//      returns 0 rows, a match the caller isn't in returns rows that don't
//      include currentUserId — both cases → 404)
//   2. All games ordered by id ASC
//   3. Offers + gold-change stats fetched in parallel via Promise.all
//      (both use WHERE game_id = ANY($1) — one round trip each)
//   Results are grouped into Maps keyed by game_id and joined in JS.
//   No N+1 — query count is constant regardless of how many games the match has.

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import type {
  HistoryGame,
  HistoryOffer,
  HistoryPlayerStat,
  TierLabel,
  OfferStatus,
  TeamId,
  GameStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Row types — raw Postgres output before reshaping
// ---------------------------------------------------------------------------

type GameRow = {
  game_id: number;
  match_id: number;
  team_a_members: number[];
  team_1_members: number[];
  winning_team: TeamId | null;
  status: GameStatus;
  created_at: string;
};

type OfferRow = {
  id: number;
  game_id: number;
  from_player_id: number;
  target_player_id: number;
  offer_amount: number | null;
  tier_label: TierLabel | null;
  status: OfferStatus;
  created_at: string;
  from_username: string;
  target_username: string;
};

type StatRow = {
  id: number;
  game_id: number;
  player_id: number;
  username: string;
  gold_change: number;
  reason: string;
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // ---- Validate route param ------------------------------------------------
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return NextResponse.json({ error: 'Invalid match ID.' }, { status: 400 });
  }

  try {
    // ---- Username lookup map + membership check ----------------------------
    // Previously a separate membership query followed by this users query —
    // two sequential round-trips. The users query already returns every
    // participant in the match, so membership can be checked in JS against
    // that result set. A non-existent match returns 0 rows (→ 404); a match
    // the caller isn't in returns rows that don't include currentUserId
    // (→ 404). Both cases collapse to 404, preserving the intentional
    // 404-not-403 behaviour noted above.
    const usersRes = await db.query<{ id: number; username: string }>(
      `SELECT u.id, u.username
       FROM users u
       JOIN match_players mp ON u.id = mp.user_id
       WHERE mp.match_id = $1`,
      [matchId]
    );

    const isMember = usersRes.rows.some(u => u.id === session.userId);
    if (!isMember) {
      return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
    }

    const idToUsername = new Map<number, string>(
      usersRes.rows.map(u => [u.id, u.username])
    );

    const usernameOf = (id: number): string =>
      idToUsername.get(id) ?? `Player#${id}`;

    // ---- All games for the match -------------------------------------------
    const gamesRes = await db.query<GameRow>(
      `SELECT
         g.id           AS game_id,
         g.match_id,
         g.team_a_members,
         g.team_1_members,
         g.winning_team,
         g.status,
         g.created_at
       FROM games g
       WHERE g.match_id = $1
       ORDER BY g.id ASC`,
      [matchId]
    );

    const games = gamesRes.rows;

    if (games.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const gameIds = games.map(g => g.game_id);

    // ---- Offers + stats in parallel ----------------------------------------
    const [offersRes, statsRes] = await Promise.all([
      // offer_amount is stripped server-side for pending offers.
      // The CASE expression means the client can never receive the exact
      // value while an offer is unresolved — not even through history.
      db.query<OfferRow>(
        `SELECT
           o.id,
           o.game_id,
           o.from_player_id,
           o.target_player_id,
           CASE WHEN o.status = 'pending' THEN NULL ELSE o.offer_amount END AS offer_amount,
           o.tier_label,
           o.status,
           o.created_at,
           u_from.username   AS from_username,
           u_target.username AS target_username
         FROM offers o
         JOIN users u_from   ON u_from.id   = o.from_player_id
         JOIN users u_target ON u_target.id = o.target_player_id
         WHERE o.game_id = ANY($1)
         ORDER BY o.created_at ASC`,
        [gameIds]
      ),

      db.query<StatRow>(
        `SELECT
           gps.id,
           gps.game_id,
           gps.player_id,
           u.username,
           gps.gold_change,
           gps.reason
         FROM game_player_stats gps
         JOIN users u ON u.id = gps.player_id
         WHERE gps.game_id = ANY($1)
         ORDER BY gps.game_id ASC, gps.id ASC`,
        [gameIds]
      ),
    ]);

    // ---- Group by game_id --------------------------------------------------
    const offersByGame = new Map<number, HistoryOffer[]>();
    for (const row of offersRes.rows) {
      const list = offersByGame.get(row.game_id) ?? [];
      list.push({
        id:             row.id,
        gameId:         row.game_id,
        fromPlayerId:   row.from_player_id,
        targetPlayerId: row.target_player_id,
        offerAmount:    row.offer_amount,
        tierLabel:      row.tier_label,
        status:         row.status,
        createdAt:      row.created_at,
        fromUsername:   row.from_username,
        targetUsername: row.target_username,
      });
      offersByGame.set(row.game_id, list);
    }

    const statsByGame = new Map<number, HistoryPlayerStat[]>();
    for (const row of statsRes.rows) {
      const list = statsByGame.get(row.game_id) ?? [];
      list.push({
        id:         row.id,
        playerId:   row.player_id,
        username:   row.username,
        goldChange: row.gold_change,
        reason:     row.reason,
      });
      statsByGame.set(row.game_id, list);
    }

    // ---- Assemble HistoryGame[] --------------------------------------------
    const history: HistoryGame[] = games.map((game, index) => ({
      gameNumber:   index + 1,
      gameId:       game.game_id,
      matchId:      game.match_id,
      createdAt:    game.created_at,
      status:       game.status,
      winningTeam:  game.winning_team,
      teamAMembers: game.team_a_members.map(usernameOf),
      team1Members: game.team_1_members.map(usernameOf),
      offers:       offersByGame.get(game.game_id) ?? [],
      playerStats:  statsByGame.get(game.game_id) ?? [],
    }));

    return NextResponse.json({ history });

  } catch (error) {
    console.error('[MATCH_HISTORY_ERROR]', error);
    return NextResponse.json({ error: 'Failed to load match history.' }, { status: 500 });
  }
}
