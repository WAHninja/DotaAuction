/**
 * Plain-English definitions of the stats this app invents.
 *
 * Market value, asking price and selection have no meaning outside DotaAuction,
 * so a label alone leaves the reader guessing. These live in one place because
 * the same stat is explained on several surfaces — a standings column header, a
 * player-page tile, a panel subtitle — and three hand-written explanations
 * would eventually disagree about what the number actually is.
 *
 * Written to be readable cold, without reference to the formula.
 */

export const GLOSSARY = {
  /**
   * Deliberately explains the size adjustment, because that is the part that
   * makes this rating different from a win rate and the part people will
   * dispute when their rating moves in a direction they did not expect.
   */
  rating:
    'Skill rating, starting at 1500. Each game moves it by how surprising the ' +
    'result was — beating a bigger or stronger side is worth more, and losing ' +
    'to one costs little.',

  ratingDeviation:
    'How settled the rating is. 1592 ±64 means it is probably somewhere ' +
    'between 1528 and 1656. The band narrows with games played and widens ' +
    'again after a break. Two players whose bands overlap are not meaningfully ' +
    'apart.',

  ratingHistory:
    'Rating after each recent game.',

  winRate:
    'Games won as a share of games played.',

  /**
   * The one that most needs explaining. Every part of this sentence is load
   * bearing: that it is about offers received, that it is a position within a
   * range rather than an amount of gold, and that the range grows — which is
   * the whole reason a raw gold figure could not be used.
   */
  marketValue:
    'How highly teammates price this player when selling them. Each offer is ' +
    'scored by where it sits in the range allowed at the time — 100% is the ' +
    'top of that range, 50% the middle.',

  /**
   * The mirror of market value: what this player asks for others, rather than
   * what others ask for them.
   *
   * Named "asking price", not "bid strength". An offer is the sender selling
   * a teammate to the losing team — submit-offer says so outright — so the
   * sender is a seller setting a price, never a buyer bidding. The old name
   * described the opposite disposition, and someone reading it would have
   * drawn exactly the wrong conclusion about their own number.
   */
  askingPrice:
    'How highly this player prices their own teammates when selling them. ' +
    'Each offer is scored by where it sits in the range allowed at the time ' +
    '— 100% is the top of that range, 50% the middle.',

  avgKda:
    'Average (kills + assists) divided by deaths, across games with reported ' +
    'Dota stats.',

  timesSold:
    'How many times this player has been traded to the other team after an ' +
    'offer was accepted.',

  // ── Economy ───────────────────────────────────────────────────────────────

  offerAcceptRate:
    'How often this player\'s offers to sell a teammate are accepted by the ' +
    'team. Every winner must submit an offer each game, so the count of offers ' +
    'means little — whether the team backs the call is the interesting part.',

  acceptedAskingPrice:
    'The average asking price of only this player\'s accepted offers. Next to ' +
    'asking price it shows whether their offers are accepted at any price or ' +
    'only when they come in cheap.',

  timesOffered:
    'How many times teammates have put this player up for sale, including ' +
    'games with only one available target. Selection, below, looks only at ' +
    'games where there was a real choice.',

  // ── League ────────────────────────────────────────────────────────────────

  matchesCompleted: 'Matches played through to a winner.',

  gamesPlayed: 'Individual games across all matches.',

  wonOutright:
    'Matches won by being the last player left on a team.',

  wonOnGold:
    'Matches won by reaching 100,000 gold.',

  shortestMatch:
    'Fewest games taken to win a match. Ties go to whoever beat more opponents.',

  longestMatch:
    'Most games a single match has run to.',

  leanestOutrightWin:
    'The least gold anyone held while winning a match outright.',

  fastestToGold:
    'Fewest games taken to reach 100,000 gold and win the match.',

  selection:
    'How often teammates choose to sell this player, counting only games where ' +
    'they had someone else they could have offered instead. The index compares ' +
    'that to pure chance — what a random pick would produce given how many ' +
    'teammates were eligible each time. 1.0x is exactly as often as chance, ' +
    '2.0x is twice as often, below 1.0x is less than chance.',
} as const;
