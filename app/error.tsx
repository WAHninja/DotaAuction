'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';

/**
 * Root error boundary.
 *
 * Without this file any thrown render error drops the user onto Next's default
 * error screen — white background, system font, stack trace in development —
 * which is jarring enough that people assume the site is broken rather than
 * that one page failed.
 *
 * Deliberately says nothing about what went wrong. `error.message` can carry
 * database text or internal identifiers, and none of it helps a reader here;
 * the digest is shown instead so a report can be matched to a server log.
 *
 * Must be a client component — Next requires it, since `reset` is a callback.
 */
export default function Error({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server logs its own errors; this catches the ones that only happen
    // in the browser, which otherwise leave no trace at all.
    console.error('[RENDER_ERROR]', error);
  }, [error]);

  return (
    <main className="max-w-lg mx-auto px-4 py-16">
      <div className="panel p-8 text-center space-y-4">
        <h1 className="font-cinzel text-2xl font-bold text-dota-gold">
          Something went wrong
        </h1>

        <p className="font-barlow text-sm text-dota-text-muted">
          This page failed to load. The rest of the site should still work.
        </p>

        <button
          type="button"
          onClick={reset}
          className="btn-secondary inline-flex items-center gap-2 mx-auto"
        >
          <RotateCw className="w-4 h-4" aria-hidden="true" />
          Try again
        </button>

        {error.digest && (
          <p className="font-barlow text-[11px] text-dota-text-dim pt-2">
            Reference: <span className="tabular-nums">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
