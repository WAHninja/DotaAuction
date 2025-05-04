import type { NextApiRequest, NextApiResponse } from 'next';
import Ably from 'ably/promises';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = req.cookies.session_user_id || 'anonymous'; // Replace with real session logic
  const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

  const tokenRequest = await ably.auth.createTokenRequest({ clientId });

  res.status(200).json(tokenRequest);
}
