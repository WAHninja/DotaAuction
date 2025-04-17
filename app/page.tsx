// app/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import page from '@/app/dashboard';

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <Dashboard />;
}
