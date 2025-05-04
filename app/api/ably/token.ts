import { NextApiRequest, NextApiResponse } from 'next';
import Ably from 'ably/promises';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create an Ably Realtime client
    const ably = new Ably.Realtime('YOUR_ABLY_API_KEY'); // Replace with your actual Ably API key

    // Request a token from Ably
    const tokenRequest = await ably.auth.requestToken({ clientId: 'unique-client-id' });

    // Return the token to the client
    res.status(200).json({ token: tokenRequest.token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
}
