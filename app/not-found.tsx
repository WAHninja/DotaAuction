import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * Root 404.
 *
 * Reachable by a stale link or a mistyped player name — /stats/[username]
 * handles unknown players itself, but anything else lands here.
 */
export default function NotFound() {
  return (
    <main className="max-w-lg mx-auto px-4 py-16">
      <div className="panel p-8 text-center space-y-4">
        <h1 className="font-cinzel text-2xl font-bold text-dota-gold">Page not found</h1>

        <p className="font-barlow text-sm text-dota-text-muted">
          That page doesn&rsquo;t exist, or it has moved.
        </p>

        <Link href="/dashboard" className="btn-secondary inline-flex items-center gap-2 mx-auto">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
