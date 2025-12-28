'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

type Match = {
  id: number;
  current_game_id?: number;
  team_a_usernames?: string[];
  team_1_usernames?: string[];
  winning_team?: string;
  players?: string[];
};

const CreateMatchForm = dynamic(
  () => import('../components/CreateMatchForm'),
  { ssr: false }
);

export default function CreateMatchFormWrapper() {
  const [ongoingMatches, setOngoingMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const res = await fetch('/api/matches');
        const data = await res.json();

        setOngoingMatches(data.ongoing ?? []);
        setCompletedMatches(data.completed ?? []);
      } catch (err) {
        console.error('Failed to load matches', err);
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-10">
        Loading matches…
      </div>
    );
  }

  return (
    <CreateMatchForm
      ongoingMatches={ongoingMatches}
      completedMatches={completedMatches}
    />
  );
}
