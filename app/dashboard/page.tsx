import { getSession } from '@/app/session';
import { redirect } from 'next/navigation';
import CreateMatchFormWrapper from '@/app/components/CreateMatchFormWrapper';
import DashboardTabs from '@/app/components/DashboardTabs';
import GameRulesCard from '@/app/components/GameRulesCard';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return redirect('/login');

  return (
    <div className="relative min-h-screen animate-fadeIn">
      <div className="relative z-10 max-w-5xl mx-auto p-6 space-y-10 text-white">
        {/* ===== Create Match + Rules Section (Always Visible) ===== */}
        <section className="flex flex-col lg:flex-row gap-6">
          {/* Create Match */}
          <div className="lg:w-1/2">
            <CreateMatchFormWrapper />
          </div>

          {/* Game Rules */}
          <div className="lg:w-1/2">
            <GameRulesCard />
          </div>
        </section>

        {/* ===== Match Tabs ===== */}
        <DashboardTabs />
      </div>
    </div>
  );
}
