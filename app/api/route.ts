import { NextRequest } from 'next/server';

// Client-relay gateway for the Dota plugin (match_reporter).
//
// Server-side HTTP is broken in Arcade-hosted lobbies, so the plugin asks a
// player's client to load this URL in a hidden DOTAHTMLPanel instead, and
// reads the answer back out of the page <title> as "{requestId}|{json}".
//
// This used to be a Supabase edge function, but Supabase serves text/html
// from *.supabase.co as text/plain with a sandbox CSP, so the panel never saw
// a <title> and every relayed request timed out client-side. Hosting it here
// returns real HTML. It just forwards to the same edge functions with a
// normal POST; the secret check stays in those functions.
//
// Query params: target (edge function name), requestId, payload (JSON).

export const dynamic = 'force-dynamic';

const ALLOWED_TARGETS = new Set(['identify-game', 'game-phase', 'match-report']);

// The plugin reads at most ~4096 characters of title back.
const TITLE_BUDGET = 4000;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function page(requestId: string, status: number, body: unknown): Response {
  const title = `${requestId}|${JSON.stringify({ status, body })}`;
  if (title.length > TITLE_BUDGET) {
    console.warn(`[DOTA_HTML_PROXY] title is ${title.length} chars, over the ${TITLE_BUDGET} budget`);
  }
  const html = `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head><body></body></html>`;
  return new Response(html, {
    status: 200, // the real status travels inside the title
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const target = params.get('target') ?? '';
  const requestId = params.get('requestId') ?? '';
  const payload = params.get('payload') ?? '';

  // requestId is echoed back into the page; keep it to what the plugin sends.
  if (!/^[\w-]{1,32}$/.test(requestId)) {
    return new Response('Invalid requestId', { status: 400 });
  }
  if (!ALLOWED_TARGETS.has(target)) {
    return page(requestId, 400, { error: `Unknown target '${target}'` });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return page(requestId, 400, { error: 'payload is not valid JSON' });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Harmless if the function doesn't verify JWTs, required if it does.
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    headers['Authorization'] = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${target}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(parsed),
      cache: 'no-store',
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: 'non-JSON response from edge function', raw: text.slice(0, 500) };
    }
    return page(requestId, res.status, body);
  } catch (err) {
    console.error('[DOTA_HTML_PROXY_ERROR]', target, err);
    return page(requestId, 502, { error: 'could not reach edge function' });
  }
}
