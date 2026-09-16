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

import {
  MIN_GAMES_FOR_RATE,
  MIN_OFFERS_FOR_STRENGTH,
} from '@/lib/stats/constants';

export const GLOSSARY = {
  /**
   * Deliberately explains the size adjustment, because that is the part that
   * makes this rating different from a win rate and the part people will
   * dispute when their rating moves in a direction they did not expect.
   */
  rating:
    'Skill rating, starting at 1500. Each game moves it by how surprising the ' +
    'result was — beating a bigger or stronger side is worth more, and losing ' +
    'to one costs little. A high rating with a modest win rate usually means ' +
    'playing from behind a lot.',

  ratingDeviation:
    'How settled the rating is. 1592 ±64 means it is probably somewhere ' +
    'between 1528 and 1656. The band narrows with games played and widens ' +
    'again after a break. Two players whose bands overlap are not meaningfully ' +
    'apart.',

  ratingHistory:
    'Rating after each recent game, oldest first. Early games swing further ' +
    'because a new rating is uncertain and moves faster; the line flattens as ' +
    'it settles.',

  winRate: `Games won as a share of games played. Hidden below ${MIN_GAMES_FOR_RATE} games, where the figure is noise.`,

  /**
   * The one that most needs explaining. Every part of this sentence is load
   * bearing: that it is about offers received, that it is a position within a
   * range rather than an amount of gold, and that the range grows — which is
   * the whole reason a raw gold figure could not be used.
   */
  marketValue:
    'How highly teammates price this player when selling them. Each offer is ' +
    'scored by where it sits in the range allowed at the time — 100% is the ' +
    'top of that range, 50% the middle — rather than by its gold amount, ' +
    'because the allowed range grows as a match goes on. ' +
    `Needs ${MIN_OFFERS_FOR_STRENGTH} offers.`,

  /**
   * The mirror of market value: what this player asks for others, rather than
   * what others ask for them.
   *
   * Named "asking price", not "bid strength". An offer is the sender selling a
   * teammate to the losing team — submit-offer says so outright — so the sender
   * is a seller setting a price, never a buyer bidding. The old name described
   * the opposite disposition, and someone reading it would have drawn exactly
   * the wrong conclusion about their own number.
   */
  askingPrice:
    'How highly this player prices their own teammates when selling them. ' +
    'Scored like market value. A high price wins more gold when accepted, but ' +
    'is accepted less often.',

  avgKda:
    'Average (kills + assists) divided by deaths, across games with reported ' +
    'Dota stats.',

  timesSold:
    'How many times this player has been traded to the other team after an ' +
    'offer was accepted.',

  // ── Economy ───────────────────────────────────────────────────────────────

  offersMade:
    'How many times this player has put a teammate up for sale. Every member ' +
    'of a winning team must submit an offer each game, so this mostly tracks ' +
    'games won rather than eagerness to trade.',

  timesOffered:
    'How many times teammates have put this player up for sale. On a ' +
    'two-player team there is only one legal target, so many of these were ' +
    'forced rather than chosen — Selection counts only the real choices.',

  // ── League ────────────────────────────────────────────────────────────────

  matchesCompleted: 'Matches played through to a winner.',

  gamesPlayed: 'Individual games across all matches. A match runs until someone wins it.',

  wonOutright:
    'Matches won by being the last player left on a team. Winning a game alone ' +
    'ends the match immediately.',

  wonOnGold: 'Matches won by reaching 100,000 gold.',

  shortestMatch:
    'Fewest games taken to win a match. Ties go to whoever beat more opponents.',

  longestMatch: 'Most games a single match has run to.',

  leanestOutrightWin:
    'The least gold anyone held while winning a match outright. Only ' +
    'last-player-standing wins count — a gold win is by definition at 100,000.',

  fastestToGold: 'Fewest games taken to reach 100,000 gold and win the match.',

  selection:
    'How often teammates choose to sell this player, counting only games where ' +
    'they had someone else they could have offered instead.',
} as const;
