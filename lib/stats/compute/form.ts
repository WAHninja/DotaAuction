/**
 * Recent form — each player's last N results, most recent last.
 *
 * The first time-aware figure in the app. Everything else is an all-time
 * aggregate, which means a player who has improved sharply looks identical to
 * one who peaked a year ago, and a recurring group has no reason to check the
 * page between sessions because nothing they see will have visibly moved.
 *
 * Deliberately raw results rather than a recent win rate. "W L W W L" shows
 * both the rate and the shape of it — three wins in a row reads differently
 * from three wins scattered through a slump — and at a sample this small a
 * percentage would imply a precision the data does not support.
 */

export type FormGameRow = {
  id: number;
  team_1_members: number[];
  team_a_members: number[];
  winning_team: 'team_1' | 'team_a' | null;
  /**
   * When the game was decided (winner picked / offer accepted), not when its
   * row was created. Null only for legacy games that predate this column.
   */
  finished_at: string | null;
};

export type FormResult = 'W' | 'L';

/** How many recent games to keep per player. */
export const FORM_LENGTH = 10;

/**
 * Per-player recent results, keyed by player id.
 *
 * Games are sorted by when they were *decided* (finished_at), not by id, and
 * not by relying on the caller's ordering. Form is the one stat where order
 * *is* the value, so it should not depend on a query's ORDER BY clause
 * surviving a future edit — but it also can't assume id order is chronological
 * order. A game's id reflects when its row was created; a game can sit
 * unplayed for a long time waiting on who's available while a game created
 * afterwards, in a different match, gets played and finishes first. Sorting by
 * id would then bury that game's result mid-sequence and let a coincidentally
 * later-finishing game usurp the "most recent" slot — silently swapping which
 * result reads as a player's latest, without dropping anything, which is what
 * makes it easy to miss.
 *
 * finished_at is null only for legacy games that predate the column; those
 * fall back to id order among themselves, which is the best available
 * approximation for rows this old.
 *
 * Games with no recorded winner are skipped: they are neither a win nor a loss,
 * and inserting them as losses would punish players for abandoned games.
 */
export function computeRecentForm(
  games: FormGameRow[],
  limit: number = FORM_LENGTH,
): Map<number, FormResult[]> {
  const ordered = [...games].sort((a, b) => {
    const aTime = a.finished_at ? Date.parse(a.finished_at) : null;
    const bTime = b.finished_at ? Date.parse(b.finished_at) : null;
    if (aTime !== null && bTime !== null) return aTime - bTime;
    // finished_at only exists for games finished after the column was added,
    // so an undated legacy row is always older than a dated one.
    if (aTime !== null) return 1;  // a is dated, b is legacy → a is later
    if (bTime !== null) return -1; // b is dated, a is legacy → a is earlier
    return a.id - b.id;            // both legacy → fall back to id order
  });
  const out = new Map<number, FormResult[]>();

  const push = (id: number, result: FormResult) => {
    const list = out.get(id);
    if (list) list.push(result);
    else out.set(id, [result]);
  };

  for (const game of ordered) {
    if (game.winning_team === null) continue;

    for (const id of game.team_1_members ?? []) {
      push(id, game.winning_team === 'team_1' ? 'W' : 'L');
    }
    for (const id of game.team_a_members ?? []) {
      push(id, game.winning_team === 'team_a' ? 'W' : 'L');
    }
  }

  // Trim to the most recent `limit`, preserving chronological order so the
  // rightmost entry is the latest game — the convention every football table
  // uses, and the one readers will assume regardless of what we choose.
  for (const [id, list] of out) {
    if (list.length > limit) out.set(id, list.slice(-limit));
  }

  return out;
}
