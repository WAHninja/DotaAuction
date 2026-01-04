'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Props = {
  gameId: number
}

export default function SelectGameWinnerForm({ gameId }: Props) {
  const router = useRouter()

  const [selectedTeam, setSelectedTeam] =
    useState<'team_1' | 'team_a' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!selectedTeam) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/game/${gameId}/select-winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winningTeamId: selectedTeam, // ✅ REQUIRED BY API
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit winner')
      }

      // Refresh match page (loads auction phase)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative my-8">
      {/* Decorative Images */}
      <div
        className="hidden sm:block absolute left-10 transform -translate-y-1/2 z-20"
        style={{ top: 'calc(50% - 5px)' }}
      >
        <Image
          src="/radiantcreeps.png"
          alt="Radiant Creeps"
          width={220}
          height={220}
        />
      </div>

      <div
        className="hidden sm:block absolute right-10 transform -translate-y-1/2 z-20"
        style={{ top: 'calc(50% - 5px)' }}
      >
        <Image
          src="/direcreeps.PNG"
          alt="Dire Creeps"
          width={220}
          height={220}
        />
      </div>

      <div className="relative z-10 bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-cinzel text-gold mb-4 text-center">
          Select Winning Team
        </h2>

        <div className="flex flex-col sm:flex-row justify-center gap-6 mb-6">
          {(['team_1', 'team_a'] as const).map(team => (
            <label
              key={team}
              className="flex items-center gap-2 cursor-pointer text-yellow-400 hover:text-yellow-300 transition"
            >
              <input
                type="radio"
                name="winner"
                checked={selectedTeam === team}
                onChange={() => setSelectedTeam(team)}
                className="accent-gold"
              />
              <span className="font-semibold">
                {team === 'team_1' ? 'Team 1' : 'Team A'}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedTeam || loading}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Winner'}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400 font-semibold">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
