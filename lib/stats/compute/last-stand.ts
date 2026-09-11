/**
 * Last stands — games entered as the only player on your team.
 *
 * This is the sharpest moment in the format. select-winner ends the match
 * immediately when the winning side has exactly one member
 * (`isSinglePlayerWin = winningMembers.length === 1`, win_type
 * 'last_standing'), so being alone is simultaneously the worst position in a
 * game and the only route to winning the whole match in it.
 *
 * Recorded as an opportunity and a conversion rather than folded into overall
 * win rate, because these games are not comparable to ordinary ones. A player
 * who reaches this position often and converts occasionally is doing something
 * quite different from one who never gets there, and an all-games win rate
 * flattens both into the same number — in fact it punishes the first, since
 * every unconverted last stand is a loss.
 *
 * Opponent counts are tracked alongside because the difficulty is not constant.
 * Alone against two is a different proposition from alone against five, and
 * without that context a conversion rate invites comparisons between players
 * who faced very different odds.
 */

export type LastStandGameRow = {
  team_1_members: number[];
  team_a_members: number[];
  winning_team: 'team_1' | 'team_a' | null;
};

export type PlayerLastStand = {
  /** Games entered alone on their side. */
  opportunities: number;
  /** How many of those they won, each of which ended the match. */
  wins: number;
  /** Mean size of the opposing team across those games, to one decimal.
   *  null when there were no opportunities. */
  avgOpponents: number | null;
};

export function computeLastStands(
  games: LastStandGameRow[],
): Map<number, PlayerLastStand> {
  const acc = new Map<number, { opps: number; wins: number; opponents: number }>();

  for (const game of games) {
    const team1 = game.team_1_members ?? [];
    const teamA = game.team_a_members ?? [];

    const sides: [number[], number[], 'team_1' | 'team_a'][] = [
      [team1, teamA, 'team_1'],
      [teamA, team1, 'team_a'],
    ];

    for (const [side, opposition, id] of sides) {
      // Exactly one, not "one or fewer" — an empty side is corrupt data rather
      // than a last stand, and would otherwise credit nobody while still being
      // silently treated as a valid shape.
      if (side.length !== 1) continue;

      const player = side[0];
      let entry = acc.get(player);
      if (!entry) { entry = { opps: 0, wins: 0, opponents: 0 }; acc.set(player, entry); }

      entry.opps += 1;
      entry.opponents += opposition.length;

      // An undecided game still counts as an opportunity faced but never as a
      // win. Excluding it entirely would quietly flatter anyone whose solo
      // games were abandoned.
      if (game.winning_team === id) entry.wins += 1;
    }
  }

  const out = new Map<number, PlayerLastStand>();
  for (const [id, e] of acc) {
    out.set(id, {
      opportunities: e.opps,
      wins:          e.wins,
      avgOpponents:  e.opps > 0 ? +(e.opponents / e.opps).toFixed(1) : null,
    });
  }
  return out;
}
