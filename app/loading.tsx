/**
 * Root loading state.
 *
 * Shown while a server component is fetching. Previously navigation to a slow
 * page left the previous screen up with no indication anything was happening,
 * which reads as an unresponsive click rather than a loading page.
 *
 * A server component with no interactivity, so it can stream immediately.
 */
export default function Loading() {
  return (
    <main className="max-w-lg mx-auto px-4 py-16" aria-busy="true">
      <div className="panel p-8 text-center space-y-4">
        {/* aria-hidden because the text below is the accessible announcement —
            a spinning box has nothing useful to say to a screen reader. */}
        <div
          aria-hidden="true"
          className="w-8 h-8 mx-auto rounded-full border-2 border-dota-border border-t-dota-gold animate-spin"
        />
        <p className="font-barlow text-sm text-dota-text-muted">Loading…</p>
      </div>
    </main>
  );
}
