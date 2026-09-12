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
    'Skill rating, starting at 1500. Every game moves it by how surprising the ' +
    'result was: beating a side that outnumbers or outranks you is worth more ' +
    'than beating one you were expected to beat, and losing to long odds costs ' +
    'little. Because team size is priced in, a low win rate with a high rating ' +
    'usually means playing from behind a lot.',

  ratingDeviation:
    'How settled a rating is, shown as a ± band. It narrows as you play games ' +
    'the model could not call in advance, and widens again if you sit out — so ' +
    'a returning player is treated as unproven rather than assumed unchanged. ' +
    'A wide band also means results move your rating further.',

  winRate: `Games won as a share of games played. Hidden below ${MIN_GAMES_FOR_RATE} games, where the figure is noise.`,

  /**
   * The one that most needs explaining. Every part of this sentence is load
   * bearing: that it is about offers received, that it is a position within a
   * range rather than an amount of gold, and that the range grows — which is
   * the whole reason a raw gold figure could not be used.
   */
  marketValue:
    'How expensively teammates price you when they put you up for sale. Offers ' +
    'are scored by where they sit in the range allowed at the time, not by ' +
    'their gold amount — the allowed range grows every game of a match, so raw ' +
    'gold would just reward long matches. 100% is the top of the range, 50% is ' +
    `the middle. Hidden below ${MIN_OFFERS_FOR_STRENGTH} offers received.`,

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
    'How expensively this player prices their own teammates when putting them ' +
    'up for sale. Scored like market value — position in the range allowed at ' +
    'the time, not the gold amount. A high figure wins more gold when an offer ' +
    'is accepted, but is less likely to be accepted at all.',

  avgKda:
    'Average (kills + assists) divided by deaths, across games with reported ' +
    'Dota stats.',

  timesSold:
    'How many times this player has been traded to the other team after an ' +
    'offer was accepted.',

  selection:
    'How often teammates choose to sell this player, counting only games where ' +
    'they had more than one player they could have offered.',
} as const;
