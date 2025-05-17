// lib/getUserMapFromOffers.ts
export function getUserMapFromOffers(games: any[]): Record<number, string> {
  const userMap: Record<number, string> = {}

  games.forEach((game) => {
    game.offers.forEach((offer: any) => {
      if (offer.from_player_id && offer.from_username) {
        userMap[offer.from_player_id] = offer.from_username
      }
      if (offer.target_player_id && offer.target_username) {
        userMap[offer.target_player_id] = offer.target_username
      }
    })
  })

  return userMap
}
