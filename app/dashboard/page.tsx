// app/dashboard/page.tsx
import { getSession } from '../../lib/session';
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import CreateMatchFormWrapper from './CreateMatchFormWrapper';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    return redirect('/login');
  }

  const result = await db.query('SELECT username FROM users WHERE id = $1', [session.user_id]);
  const user = result.rows[0];

  return (
    <div className="p-6 text-white space-y-6">
      <h1 className="text-3xl font-bold">Welcome, {user.username}!</h1>
      <p className="mt-4">This is your dashboard.</p>

      <div className="mt-6">
        <h2 className="text-2xl font-semibold mb-2">Create a Match</h2>
        <CreateMatchFormWrapper />
      </div>
    </div>
  );
}
