import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '../../../lib/session';

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect('https://dotaauction.onrender.com');
  await destroySession(response);
  return response;
}
