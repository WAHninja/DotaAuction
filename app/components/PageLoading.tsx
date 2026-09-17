/**
 * The app's single loading window.
 *
 * Used by app/loading.tsx for route transitions and by any client page that
 * fetches its own data. There were previously two: this one and a bespoke
 * spinner inside the match page, which differed in size, colour and wording.
 *
 * The match page's version could not simply be deleted. app/loading.tsx covers
 * a route segment while its *server* component suspends; the match page is a
 * client component that fetches in an effect, so by the time it renders Next
 * considers the navigation complete and the loading boundary is long gone.
 * Removing its own state would have left a blank panel during the fetch.
 *
 * Making it one shared component is the version of "remove the separate
 * loading window" that actually holds: one implementation, two callers.
 *
 * No 'use client' — nothing here is interactive, so it can render on the server
 * for the route-transition case and still be imported by client pages.
 */
export default function PageLoading({ message = 'Loading…' }: {
  /** Overridden where the wait has a specific subject, e.g. "Loading match…". */
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
      <div className="panel p-8 text-center space-y-4">
        {/* aria-hidden because the message below is the accessible
            announcement — a spinning box has nothing to say to a reader. */}
        <div
          aria-hidden="true"
          className="w-8 h-8 mx-auto rounded-full border-2 border-dota-border border-t-dota-gold animate-spin"
        />
        <p className="font-barlow text-sm text-dota-text-muted">{message}</p>
      </div>
    </div>
  );
}
