// app/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Dashboard from '@/components/Dashboard';

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <Dashboard />;
}
