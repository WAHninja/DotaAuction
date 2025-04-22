// pages/api/game/[id]/accept-offer.ts

import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const matchId = req.query.id as string;
  const { offerId } = req.body;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed.' });
  }

  const session = await getSession();
  const userId = session?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  try {
    // Get latest game for the match
    const { rows: gameRows } = await db.query(
      'SELECT * FROM Games WHERE match_id = $1 ORDER BY id DESC LIMIT 1',
      [matchId]
    );
    if (gameRows.length === 0) return res.status(404).json({ message: 'Game not found.' });

    const game = gameRows[0];
    const winningTeam = game.winning_team_id;
    const teamA = game.team_a_members;
    const team1 = game.team_1_members;

    const losingTeamMembers = winningTeam === 'team_a' ? team1 : teamA;

    if (!losingTeamMembers.includes(userId)) {
      return res.status(403).json({ message: 'You are not on the losing team.' });
    }

    // Check if offer exists and is pending
    const { rows: offerRows } = await db.query(
      'SELECT * FROM Offers WHERE id = $1 AND game_id = $2 AND status = $3',
      [offerId, game.id, 'pending']
    );
    if (offerRows.length === 0) {
      return res.status(404).json({ message: 'Offer not found or already accepted.' });
    }

    // Accept the offer
    const result = await db.query(
      'UPDATE Offers SET status = $1 WHERE id = $2 RETURNING *',
      ['accepted', offerId]
    );

    res.status(200).json({ message: 'Offer accepted.', offer: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}
