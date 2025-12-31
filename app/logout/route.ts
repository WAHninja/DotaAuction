// app/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/app/session';

export async function POST(req: NextRequest) {
  // Create a redirect response to the login page
  const response = NextResponse.redirect(new URL('/login', req.url));

  try {
    // Clear session cookie and remove session from DB
    await destroySession(response);
  } catch (error) {
    console.error('Failed to destroy session:', error);
    // Still redirect even if destroying the session fails
  }

  return response;
}
