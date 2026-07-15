'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ConfirmModal from '@/components/ConfirmModal'

type WorkoutCard = {
  workoutId: string | null
  workoutName: string
  workoutDate: string
  results: any[]
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const clientId = params.id

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [trainingGroupIds, setTrainingGroupIds] = useState<string[]>([])
  const [trainingGroups, setTrainingGroups] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [checkinCount, setCheckinCount] = useState(0)
  const [resultsLoading, setResultsLoading] = useState(true)
  const [workoutCards, setWorkoutCards] = useState<WorkoutCard[]>([])
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadClient()
    loadResults()
    loadCheckinCount()
    loadTrainingGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const loadClient = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients?id=${clientId}`)
      const data = await res.json()

      if (!data) {
        setNotFound(true)
        return
      }

      setName(data.name || '')
      setCode(data.code || '')
      setTrainingGroupIds(Array.isArray(data.training_groups) ? data.training_groups.map((g: any) => g.id) : [])
    } catch (error) {
      console.error('Failed to load client:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTrainingGroups = async () => {
    try {
      const res = await fetch('/api/training-groups')
      const data = await res.json()
      if (Array.isArray(data)) {
        setTrainingGroups(data)
      }
    } catch (error) {
      console.error('Failed to load training groups:', error)
    }
  }

  const loadCheckinCount = async () => {
    try {
      const res = await fetch(`/api/checkins?client_id=${clientId}`)
      const data = await res.json()
      setCheckinCount(typeof data?.count === 'number' ? data.count : 0)
    } catch (error) {
      console.error('Failed to load checkin count:', error)
    }
  }

  const loadResults = async () => {
    setResultsLoading(true)
    try {
      const res = await fetch(`/api/results?client_id=${clientId}&include_details=true`)
      const data = await res.json()

      if (!Array.isArray(data)) {
        setWorkoutCards([])
        return
      }

      const byWorkout = new Map<string, WorkoutCard>()
      data.forEach((result: any) => {
        const key = result.workout_id || `${result.workout_name}-${result.workout_date}`
        if (!byWorkout.has(key)) {
          byWorkout.set(key, {
            workoutId: result.workout_id || null,
            workoutName: result.workout_name || 'Bez tréninku',
            workoutDate: result.workout_date || 'Bez data',
            results: [],
          })
        }
        byWorkout.get(key)!.results.push(result)
      })

      const cards = Array.from(byWorkout.values()).sort((a, b) =>
        (b.workoutDate || '').localeCompare(a.workoutDate || '')
      )

      setWorkoutCards(cards)
    } catch (error) {
      console.error('Failed to load results:', error)
      setWorkoutCards([])
    } finally {
      setResultsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, name: name.trim(), code: code.trim(), training_group_ids: trainingGroupIds }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setSaveError(data?.error || 'Nepodařilo se uložit změny.')
        return
      }

      setSaveSuccess(true)
    } catch (error) {
      console.error('Failed to save client:', error)
      setSaveError('Nepodařilo se uložit změny.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setConfirmDeleteOpen(false)
    setDeleting(true)

    try {
      const res = await fetch('/api/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId }),
      })

      if (!res.ok) {
        throw new Error('Failed to delete client')
      }

      router.push('/admin')
    } catch (error) {
      console.error('Failed to delete client:', error)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Načítám klienta...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-ink-muted">Klient nenalezen.</p>
        <Link href="/admin" className="text-accent-strong hover:opacity-70">
          Zpět do adminu
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border">
        <div className="max-w-3xl mx-auto py-6 px-4">
          <Link href="/admin" className="text-sm text-accent-strong hover:opacity-70">
            ← Zpět do adminu
          </Link>
          <h1 className="text-2xl font-bold mt-1">{name || 'Klient'}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <div className="bg-surface rounded-3xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Údaje klienta</h2>
            <span className="text-sm text-ink-muted">Tréninky: {checkinCount}</span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <label className="block text-sm font-medium text-ink">
              <span className="mb-1 block">Jméno</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-2xl"
              />
            </label>

            <label className="block text-sm font-medium text-ink">
              <span className="mb-1 block">Přístupový kód</span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-2xl"
              />
            </label>

            <div className="space-y-1">
              <span className="block text-sm font-medium text-ink">Tréninkové skupiny</span>
              {trainingGroups.length === 0 ? (
                <p className="text-sm text-ink-muted">Zatím žádné skupiny.</p>
              ) : (
                trainingGroups.map((group) => (
                  <label key={group.id} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={trainingGroupIds.includes(group.id)}
                      onChange={(e) =>
                        setTrainingGroupIds((prev) =>
                          e.target.checked ? [...prev, group.id] : prev.filter((id) => id !== group.id)
                        )
                      }
                      className="h-4 w-4"
                    />
                    {group.name}
                  </label>
                ))
              )}
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            {saveSuccess && <p className="text-sm text-green-600">Uloženo.</p>}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={saving}
                className="bg-accent text-white px-4 py-2 rounded-full hover:bg-accent-strong disabled:opacity-50"
              >
                {saving ? 'Ukládám...' : 'Uložit'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleting}
                className="text-sm text-red-600 hover:opacity-70 disabled:opacity-50"
              >
                {deleting ? 'Mazání...' : 'Smazat klienta'}
              </button>
            </div>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Výsledky podle tréninku</h2>

          {resultsLoading ? (
            <p className="text-sm text-ink-muted">Načítám výsledky...</p>
          ) : workoutCards.length === 0 ? (
            <div className="bg-surface rounded-3xl shadow-sm p-6 text-center">
              <p className="text-ink-muted">Klient zatím nezapsal žádný výsledek.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workoutCards.map((card) => (
                <div
                  key={card.workoutId || `${card.workoutName}-${card.workoutDate}`}
                  className="bg-surface rounded-3xl shadow-sm p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{card.workoutName}</p>
                    <span className="text-xs text-ink-muted">{card.workoutDate}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {card.results.map((result: any) => (
                      <div key={result.id} className="text-sm flex flex-wrap items-center gap-2">
                        <span className="font-medium">{result.exercise_name}:</span>
                        <span>{result.value}</span>
                        {result.rpe ? (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-strong">RPE {result.rpe}</span>
                        ) : null}
                        {result.notes ? <span className="text-ink-muted">({result.notes})</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Smazat klienta"
        message="Opravdu chceš smazat tohoto klienta? Smažou se i jeho výsledky a docházka."
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  )
}
