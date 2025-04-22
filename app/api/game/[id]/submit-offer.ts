// pages/api/game/[id]/submit-offer.ts

import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const matchId = req.query.id as string;
  const { offerAmount, targetPlayerId } = req.body;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed.' });
  }

  if (offerAmount < 250 || offerAmount > 2000) {
    return res.status(400).json({ message: 'Offer amount must be between 250 and 2000.' });
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
    const winningTeam = game.winning_team;
    const teamA = game.team_a_members;
    const team1 = game.team_1_members;

    const winningTeamMembers = winningTeam === 'team_a' ? teamA : team1;

    if (!winningTeamMembers.includes(userId)) {
      return res.status(403).json({ message: 'You are not on the winning team.' });
    }

    if (!winningTeamMembers.includes(targetPlayerId) || targetPlayerId === userId) {
      return res.status(400).json({ message: 'Target player must be a teammate and not yourself.' });
    }

    const existingOffer = await db.query(
      'SELECT * FROM Offers WHERE from_player_id = $1 AND game_id = $2',
      [userId, game.id]
    );
    if (existingOffer.rows.length > 0) {
      return res.status(400).json({ message: 'You have already submitted an offer.' });
    }

    const result = await db.query(
      `INSERT INTO Offers (game_id, from_player_id, target_player_id, offer_amount, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING *`,
      [game.id, userId, targetPlayerId, offerAmount]
    );

    res.status(201).json({ message: 'Offer submitted.', offer: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}
