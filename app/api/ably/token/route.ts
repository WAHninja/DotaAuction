import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably/promises';

export async function GET(req: NextRequest) {
  const clientId = req.cookies.get('session_user_id')?.value || 'anonymous'; // Accessing the value property of the cookie

  const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

  try {
    const tokenRequest = await ably.auth.createTokenRequest({ clientId });
    return NextResponse.json(tokenRequest);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create token request' }, { status: 500 });
  }
}
