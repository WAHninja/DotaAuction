/**
 * Plain-English definitions of the stats this app invents.
 *
 * Market value, bid strength and selection have no meaning outside DotaAuction,
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
  winRate: `Games won as a share of games played. Hidden below ${MIN_GAMES_FOR_RATE} games, where the figure is noise.`,

  /**
   * The one that most needs explaining. Every part of this sentence is load
   * bearing: that it is about offers received, that it is a position within a
   * range rather than an amount of gold, and that the range grows — which is
   * the whole reason a raw gold figure could not be used.
   */
  marketValue:
    'How highly other players bid for you. Offers are scored by where they sit ' +
    'in the range allowed at the time, not by their gold amount — the allowed ' +
    'range grows every game of a match, so raw gold would just reward long ' +
    'matches. 100% is the top of the range, 50% is the middle. ' +
    `Hidden below ${MIN_OFFERS_FOR_STRENGTH} offers received.`,

  bidStrength:
    'How hard this player bids when making offers, scored the same way as ' +
    'market value: their position in the range allowed at the time, not the ' +
    'gold amount.',

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
