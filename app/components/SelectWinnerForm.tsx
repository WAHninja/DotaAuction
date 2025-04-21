import { useState } from 'react';

type SelectWinnerFormProps = {
  matchId: number;
  show: boolean; // Only show form if the latest game is "In progress"
};

export default function SelectWinnerForm({ matchId, show }: SelectWinnerFormProps) {
  const [selectedTeam, setSelectedTeam] = useState<'team_1' | 'team_a' | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!show) return null;

  const handleSubmit = async () => {
    if (!selectedTeam) {
      setMessage('Please select a team.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/match/${matchId}/select-winner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ winningTeamId: selectedTeam }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Winning team selected successfully!');
      } else {
        setMessage(data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error(err);
      setMessage('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border p-4 rounded-xl bg-white shadow-md mt-6">
      <h2 className="text-xl font-bold mb-2">Select Winning Team</h2>
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="winner"
            value="team_1"
            onChange={() => setSelectedTeam('team_1')}
          />
          Team 1
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="winner"
            value="team_a"
            onChange={() => setSelectedTeam('team_a')}
          />
          Team A
        </label>
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Winner'}
      </button>
      {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
    </div>
  );
}
