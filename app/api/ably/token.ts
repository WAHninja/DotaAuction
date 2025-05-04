import { NextApiRequest, NextApiResponse } from 'next';
import Ably from 'ably';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ably = new Ably.Realtime('your-ably-api-key'); // Use your Ably API key here

  try {
    // Generate the token for the client
    const tokenRequest = await ably.auth.requestToken({ clientId: 'unique-client-id' });

    // Return the token to the client
    res.status(200).json({ token: tokenRequest.token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
}
