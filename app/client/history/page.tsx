'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ExerciseGroup = {
  exerciseName: string
  entries: any[]
}

export default function ClientHistory() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState('Klient')
  const [groups, setGroups] = useState<ExerciseGroup[]>([])

  useEffect(() => {
    const storedClientId = localStorage.getItem('athletepro_client_id')
    const storedToken = localStorage.getItem('athletepro_client_token')
    const storedClientName = localStorage.getItem('athletepro_client_name')

    if (!storedClientId || !storedToken) {
      router.push('/client')
      return
    }

    if (storedClientName) {
      setClientName(storedClientName)
    }

    const verifyAndLoad = async () => {
      try {
        const verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: storedClientId, token: storedToken }),
        })

        if (!verifyRes.ok) {
          router.push('/client')
          return
        }

        const res = await fetch(`/api/results?client_id=${storedClientId}&include_details=true`)
        const data = await res.json()

        if (!Array.isArray(data)) {
          setGroups([])
          return
        }

        const byExercise = new Map<string, any[]>()
        data.forEach((result: any) => {
          const key = result.exercise_name || 'Ostatní'
          const list = byExercise.get(key) || []
          list.push(result)
          byExercise.set(key, list)
        })

        const grouped: ExerciseGroup[] = Array.from(byExercise.entries()).map(([exerciseName, entries]) => ({
          exerciseName,
          entries: entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        }))

        grouped.sort((a, b) => new Date(b.entries[0].created_at).getTime() - new Date(a.entries[0].created_at).getTime())

        setGroups(grouped)
      } catch (error) {
        console.error('Failed to load history:', error)
      } finally {
        setLoading(false)
      }
    }

    verifyAndLoad()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám historii...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-2xl mx-auto py-4 px-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Historie výsledků</h1>
            <p className="text-sm text-gray-600">Přihlášený klient: {clientName}</p>
          </div>
          <Link
            href="/client/workout"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
          >
            Zpět na trénink
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-4 space-y-4">
        {groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">Zatím nemáš zapsané žádné výsledky.</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.exerciseName} className="bg-white rounded-lg shadow p-6">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">{group.exerciseName}</h2>
                {group.entries[0]?.exercise_description?.trim() ? (
                  <p className="text-xs text-gray-500 whitespace-pre-wrap break-words mt-1">
                    {group.entries[0].exercise_description}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.value}</span>
                      {entry.rpe ? (
                        <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-700">RPE {entry.rpe}</span>
                      ) : null}
                      {entry.notes ? <span className="text-sm text-gray-500">{entry.notes}</span> : null}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {entry.workout_date || 'Bez data'}{entry.workout_name ? ` · ${entry.workout_name}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
