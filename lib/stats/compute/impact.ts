/**
 * Impact after being sold — how a player performs the moment they're traded
 * mid-match.
 *
 * accept-offer moves the sold player from the team that just won a game onto
 * the team that just lost it (and bought them) — see newTeamA/newTeam1 there.
 * The next game created in that match is the first real test of that trade
 * from the buyer's side: did the player they picked up actually swing it?
 *
 * ── Finding "the next game" ──────────────────────────────────────────────
 *
 * This has to mean the game that was created immediately after the sale, not
 * merely the next *decided* one. A sale's next game can itself still be
 * unplayed, or played but not yet auctioned — either way it has exactly one
 * successor, and the wrong one must never be substituted for it just because
 * it hasn't finished yet.
 *
 * That successor is found from every game's id and match_id — the full set,
 * regardless of whether it has a result — the same reasoning gold-timeline.ts
 * relies on for the same relationship: games within one match finish in
 * creation order, so id order is chronological order *within a match*. That
 * successor id is then looked up against the decided-games map to see
 * whether it has resolved yet and, if so, who won it.
 *
 * A sale with no successor at all (it ended the match outright via the gold
 * threshold) and a sale whose successor hasn't been decided yet are both
 * excluded rather than counted as a loss — there is no result to learn from
 * either way, the same reasoning every other compute module in this
 * directory applies to a game with no winner.
 */

export type ImpactGameRef = {
  id: number;
  match_id: number;
};

export type ImpactDecidedGame = {
  id: number;
  team_1_members: number[];
  team_a_members: number[];
  winning_team: 'team_1' | 'team_a' | null;
};

export type ImpactOfferRow = {
  game_id: number;
  target_player_id: number;
  status: string;
};

export type PlayerImpact = {
  /** Sales followed by a decided next game — the denominator. Excludes sales
   *  that ended the match outright and sales whose next game hasn't been
   *  decided yet. */
  opportunities: number;
  /** How many of those the player's new team went on to win. */
  wins: number;
};

/**
 * Per-player impact after being sold, keyed by player id.
 *
 * `allGames` must be every game regardless of status — it exists only to
 * establish true id-adjacency within a match, and filtering it the way
 * `decidedGames` is filtered would make an undecided game invisible to the
 * adjacency search, silently promoting the game *after* it into "the next
 * game" instead.
 */
export function computeSaleImpact(
  offers: ImpactOfferRow[],
  allGames: ImpactGameRef[],
  decidedGames: ImpactDecidedGame[],
): Map<number, PlayerImpact> {
  const byMatch = new Map<number, ImpactGameRef[]>();
  for (const g of allGames) {
    const list = byMatch.get(g.match_id);
    if (list) list.push(g);
    else byMatch.set(g.match_id, [g]);
  }

  // Every game's immediate successor within its own match.
  const nextGameId = new Map<number, number>();
  for (const list of byMatch.values()) {
    list.sort((a, b) => a.id - b.id);
    for (let i = 0; i < list.length - 1; i++) {
      nextGameId.set(list[i].id, list[i + 1].id);
    }
  }

  const decidedById = new Map<number, ImpactDecidedGame>(
    decidedGames.map(g => [g.id, g]),
  );

  const acc = new Map<number, { opps: number; wins: number }>();
  const bucket = (id: number) => {
    let b = acc.get(id);
    if (!b) { b = { opps: 0, wins: 0 }; acc.set(id, b); }
    return b;
  };

  for (const offer of offers) {
    if (offer.status !== 'accepted') continue;

    const nextId = nextGameId.get(offer.game_id);
    if (nextId === undefined) continue; // the sale ended the match outright

    const next = decidedById.get(nextId);
    if (!next || next.winning_team === null) continue; // not decided yet

    const b = bucket(offer.target_player_id);
    b.opps += 1;

    const winners = next.winning_team === 'team_1' ? next.team_1_members : next.team_a_members;
    if (winners.includes(offer.target_player_id)) b.wins += 1;
  }

  const out = new Map<number, PlayerImpact>();
  for (const [id, b] of acc) {
    out.set(id, { opportunities: b.opps, wins: b.wins });
  }
  return out;
}
