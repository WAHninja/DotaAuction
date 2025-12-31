// app/api/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/app/session';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.next();
    await destroySession(response);

    // Check if request is fetch/XHR (client-side)
    const isApiRequest = req.headers.get('accept')?.includes('application/json');

    if (isApiRequest) {
      return NextResponse.json({ success: true });
    } else {
      // Determine base URL for redirect
      const baseUrl =
        process.env.NODE_ENV === 'production'
          ? process.env.RENDER_EXTERNAL_URL
          : `${req.nextUrl.protocol}//${req.nextUrl.host}`;
      return NextResponse.redirect(`${baseUrl}/login`);
    }
  } catch (error) {
    console.error('Logout failed:', error);

    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
  }
}
