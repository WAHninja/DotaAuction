import { NextResponse } from 'next/server';
import { importPKCS8 } from 'jose';

// TEMPORARY DIAGNOSTIC — remove after fixing the 500
// Hit: /api/jaas/diag in your browser while logged in
export async function GET() {
  const results: Record<string, string> = {};

  const appId  = process.env.JAAS_APP_ID;
  const keyId  = process.env.JAAS_API_KEY_ID;
  const rawKey = process.env.JAAS_PRIVATE_KEY;

  results.JAAS_APP_ID       = appId  ? `✅ set (${appId})`  : '❌ MISSING';
  results.JAAS_API_KEY_ID   = keyId  ? `✅ set (${keyId})`  : '❌ MISSING';
  results.JAAS_PRIVATE_KEY  = rawKey
    ? `✅ set (${rawKey.length} chars, starts: ${rawKey.slice(0, 40).replace(/\n/g, '\\n')})`
    : '❌ MISSING';

  if (rawKey) {
    // Try to normalise and parse the key
    let pem = rawKey.replace(/\\n/g, '\n').trim();

    if (!pem.includes('\n')) {
      const match = pem.match(
        /^(-----BEGIN [^-]+-----)([A-Za-z0-9+/=]+)(-----END [^-]+-----)$/
      );
      if (match) {
        const body = match[2].replace(/.{64}/g, '$&\n');
        pem = `${match[1]}\n${body}\n${match[3]}`;
        results.key_reformat = 'applied (was single line)';
      } else {
        results.key_reformat = '❌ single-line but could not parse PEM boundaries';
      }
    } else {
      results.key_reformat = 'not needed (already has newlines)';
    }

    results.key_starts_with = pem.split('\n')[0];
    results.key_ends_with   = pem.split('\n').filter(Boolean).at(-1) ?? '';

    try {
      await importPKCS8(pem, 'RS256');
      results.key_parse = '✅ importPKCS8 succeeded';
    } catch (err: any) {
      results.key_parse = `❌ importPKCS8 FAILED: ${err?.message ?? err}`;
    }
  }

  return NextResponse.json(results, { status: 200 });
}
