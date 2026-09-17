/**
 * Starting gold for every player at the beginning of every game.
 *
 * Nothing stores this. `match_players.gold` is the current figure only, and
 * `game_player_stats` records movements rather than balances. But every player
 * starts a match on zero (matches/route.ts inserts `gold` as 0) and every
 * movement is logged — win rewards, loss penalties, and accepted trades, since
 * accept-offer writes to game_player_stats as well as updating the balance — so
 * the balance going into any game is exactly the sum of everything before it.
 *
 * Gold is reset per match, so totals never carry across a match boundary.
 */

export type GoldGameRow = {
  id: number;
  match_id: number;
};

export type GoldChangeRow = {
  game_id: number;
  player_id: number;
  gold_change: number;
};

/** gameId -> playerId -> gold held entering that game. */
export type GoldTimeline = Map<number, Map<number, number>>;

export function buildGoldTimeline(
  games: GoldGameRow[],
  changes: GoldChangeRow[],
): GoldTimeline {
  const changesByGame = new Map<number, GoldChangeRow[]>();
  for (const c of changes) {
    const list = changesByGame.get(c.game_id);
    if (list) list.push(c);
    else changesByGame.set(c.game_id, [c]);
  }

  const byMatch = new Map<number, GoldGameRow[]>();
  for (const g of games) {
    const list = byMatch.get(g.match_id);
    if (list) list.push(g);
    else byMatch.set(g.match_id, [g]);
  }

  const timeline: GoldTimeline = new Map();

  for (const matchGames of byMatch.values()) {
    // Games finish in creation order, so id order is chronological order.
    matchGames.sort((a, b) => a.id - b.id);

    const running = new Map<number, number>();

    for (const game of matchGames) {
      // Snapshot before applying this game's movements — the balance a player
      // took into the game, not the one they left with.
      timeline.set(game.id, new Map(running));

      for (const c of changesByGame.get(game.id) ?? []) {
        running.set(c.player_id, (running.get(c.player_id) ?? 0) + c.gold_change);
      }
    }
  }

  return timeline;
}

/**
 * A side's share of the gold in play at the start of a game, 0–1.
 *
 * A share rather than an absolute difference, for the same reason offer
 * strength is a share: gold pots grow through a match, so a 2,000 lead in game
 * two and a 2,000 lead in game twelve are not remotely the same advantage.
 *
 * Returns 0.5 when there is no gold at all — game one of every match — so the
 * term contributes nothing rather than dividing by zero.
 *
 * Negative balances are floored at zero. A player in debt has no buying power
 * to contribute, and letting a negative drag a team's share below zero would
 * imply the opposition holds more than all of the gold.
 */
export function goldShare(
  sideA: number[],
  sideB: number[],
  gold: Map<number, number> | undefined,
): number {
  if (!gold) return 0.5;

  const total = (side: number[]) =>
    side.reduce((sum, id) => sum + Math.max(0, gold.get(id) ?? 0), 0);

  const a = total(sideA);
  const b = total(sideB);
  if (a + b === 0) return 0.5;
  return a / (a + b);
}
