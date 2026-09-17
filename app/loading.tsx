import PageLoading from '@/app/components/PageLoading';

/**
 * Root loading state, shown while a route's server component suspends.
 *
 * Delegates to the shared component so route transitions and client-side
 * fetches present the same window rather than two different spinners.
 */
export default function Loading() {
  return <PageLoading />;
}
