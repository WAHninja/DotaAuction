// utils/fetchPublish.ts
// Frontend-safe wrapper to publish events via your API routes

export async function fetchPublish(matchId: number, event: string, data: any) {
  const res = await fetch(`/api/game/${matchId}/publish-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.message || `Failed to publish event "${event}" for match ${matchId}`
    );
  }

  return res.json();
}
