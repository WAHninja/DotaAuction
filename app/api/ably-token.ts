// /pages/api/ably-token.ts

import { NextApiRequest, NextApiResponse } from 'next';
import Ably from 'ably/promises';

// Initialize Ably with your API key
const ably = new Ably.Realtime({
  key: process.env.ABLY_API_KEY,  // Your Ably API key (should be in your .env file)
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create a token request using the Ably API
    const tokenRequest = await ably.auth.createTokenRequest();
    res.status(200).json({ token: tokenRequest.token });
  } catch (error) {
    res.status(500).json({ error: 'Error generating token' });
  }
}
