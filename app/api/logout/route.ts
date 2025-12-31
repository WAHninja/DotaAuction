import { NextResponse } from 'next/server';
import { destroySession } from '@/app/session';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    await destroySession(response); // clears DB + cookie
    return response;
  } catch (error) {
    console.error('Failed to logout:', error);
    return NextResponse.json({ success: false, error: 'Failed to logout' }, { status: 500 });
  }
}
