'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

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

  const handleLogout = () => {
    localStorage.removeItem('athletepro_client_id')
    localStorage.removeItem('athletepro_client_token')
    localStorage.removeItem('athletepro_client_name')
    localStorage.removeItem('athletepro_coach_slug')
    router.push('/client')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Načítám historii...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-2xl mx-auto px-4 pt-8 pb-2">
        <h1 className="text-3xl font-bold tracking-tight">Historie výsledků</h1>
        <p className="text-sm text-ink-muted mt-1">Přihlášený klient: {clientName}</p>
      </header>

      <main className="max-w-2xl mx-auto py-4 px-4 pb-28 space-y-4">
        {groups.length === 0 ? (
          <div className="bg-surface rounded-3xl shadow-sm p-6 text-center">
            <p className="text-ink-muted">Zatím nemáš zapsané žádné výsledky.</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.exerciseName} className="bg-surface rounded-3xl shadow-sm p-6">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">{group.exerciseName}</h2>
                {group.entries[0]?.exercise_description?.trim() ? (
                  <p className="text-xs text-ink-muted whitespace-pre-wrap break-words mt-1">
                    {group.entries[0].exercise_description}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.value}</span>
                      {entry.rpe ? (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-strong">RPE {entry.rpe}</span>
                      ) : null}
                      {entry.notes ? <span className="text-sm text-ink-muted">{entry.notes}</span> : null}
                    </div>
                    <span className="text-xs text-ink-muted whitespace-nowrap">
                      {entry.workout_date || 'Bez data'}{entry.workout_name ? ` · ${entry.workout_name}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      <BottomNav active="history" onLogout={handleLogout} />
    </div>
  )
}
