import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/app/session';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });

  try {
    await destroySession(response); // clears session cookie + removes from DB
  } catch (error) {
    console.error('Error destroying session:', error);
    return NextResponse.json({ success: false, error: 'Failed to logout' }, { status: 500 });
  }

  return response;
}
