'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HorizontalCalendar, { toDateString } from '@/components/HorizontalCalendar'

type ExerciseFormState = {
  value: string
  notes: string
  rpe: string
}

type ExerciseFeedback = {
  message: string
  kind: 'success' | 'error'
}

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidDateParam(value: string): boolean {
  if (!DATE_PARAM_PATTERN.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  // Catches values that match the format but aren't real calendar days
  // (e.g. 2026-13-45 or 2026-02-30), which JS would otherwise silently
  // roll over into a different date instead of rejecting.
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function formatWorkoutCount(count: number) {
  if (count === 1) return `${count} trénink`
  if (count >= 2 && count <= 4) return `${count} tréninky`
  return `${count} tréninků`
}

export default function ClientWorkout() {
  const router = useRouter()
  const params = useParams<{ date: string }>()
  const rawDate = params.date

  const [selectedDate, setSelectedDate] = useState(() =>
    isValidDateParam(rawDate) ? rawDate : toDateString(new Date())
  )
  const [checkedInWorkouts, setCheckedInWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [workoutLoading, setWorkoutLoading] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientName, setClientName] = useState('Klient')
  const [hasWorkoutToday, setHasWorkoutToday] = useState(false)
  const [attendedCount, setAttendedCount] = useState(0)
  const [workoutDates, setWorkoutDates] = useState<string[]>([])
  const [formState, setFormState] = useState<Record<string, ExerciseFormState>>({})
  const [existingResults, setExistingResults] = useState<Record<string, { id: string; value: string; notes: string; rpe: string }>>({})
  const [submittingExerciseId, setSubmittingExerciseId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, ExerciseFeedback>>({})

  useEffect(() => {
    if (!isValidDateParam(rawDate)) {
      router.replace(`/client/workout/${toDateString(new Date())}`)
      return
    }

    setSelectedDate((prev) => (prev === rawDate ? prev : rawDate))
  }, [rawDate, router])

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    // Rewrite the URL bar directly instead of going through the Next.js
    // router: navigating to a new value of this dynamic route remounts the
    // whole page component (loading/clientId/etc. all reset), which is the
    // full-page flash this avoids. history.replaceState updates the address
    // bar for bookmarking without triggering a route transition.
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/client/workout/${date}`)
    }
  }

  useEffect(() => {
    const storedClientId = localStorage.getItem('athletepro_client_id')
    const storedToken = localStorage.getItem('athletepro_client_token')

    if (!storedClientId || !storedToken) {
      router.push('/client')
      return
    }

    const loadClientName = async (cId: string) => {
      const storedClientName = localStorage.getItem('athletepro_client_name')
      if (storedClientName) {
        setClientName(storedClientName)
        return
      }

      try {
        const coachSlug = localStorage.getItem('athletepro_coach_slug')
        const url = coachSlug ? `/api/clients?coach=${encodeURIComponent(coachSlug)}` : '/api/clients'
        const response = await fetch(url)
        if (!response.ok) {
          return
        }

        const clients = await response.json()
        const matchedClient = clients.find((client: any) => client.id === cId)
        if (matchedClient?.name) {
          setClientName(matchedClient.name)
          localStorage.setItem('athletepro_client_name', matchedClient.name)
        }
      } catch (error) {
        console.error('Failed to load client name:', error)
      }
    }

    const verifyAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: storedClientId, token: storedToken }),
        })

        if (!response.ok) {
          router.push('/client')
          return
        }

        await loadClientName(storedClientId)
        setClientId(storedClientId)
      } catch (error) {
        console.error('Failed to verify token:', error)
        router.push('/client')
      }
    }

    verifyAuth()
  }, [router])

  useEffect(() => {
    const loadWorkoutDates = async () => {
      try {
        const coachSlug = localStorage.getItem('athletepro_coach_slug')
        const url = coachSlug ? `/api/workouts?coach=${encodeURIComponent(coachSlug)}` : '/api/workouts'
        const res = await fetch(url)
        const data = await res.json()
        if (Array.isArray(data)) {
          setWorkoutDates(data.map((workoutItem: any) => workoutItem.date))
        }
      } catch (error) {
        console.error('Failed to fetch workout dates:', error)
      }
    }

    loadWorkoutDates()
  }, [])

  useEffect(() => {
    if (!clientId) return

    setWorkoutLoading(true)
    loadWorkoutForDate(clientId, selectedDate).finally(() => {
      setWorkoutLoading(false)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, selectedDate])

  const getDraftStorageKey = (cId: string, workoutDate: string) => `athletepro_workout_draft_${cId}_${workoutDate}`

  const saveDraftToStorage = (cId: string, workoutDate: string, nextState: Record<string, ExerciseFormState>) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getDraftStorageKey(cId, workoutDate), JSON.stringify(nextState))
  }

  const loadDraftFromStorage = (cId: string, workoutDate: string) => {
    if (typeof window === 'undefined') return {}

    try {
      const storedDraft = window.localStorage.getItem(getDraftStorageKey(cId, workoutDate))
      if (!storedDraft) return {}

      const parsed = JSON.parse(storedDraft)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (error) {
      console.error('Failed to parse workout draft:', error)
      return {}
    }
  }

  const fetchExistingResults = async (cId: string, workoutsList: any[], date: string) => {
    try {
      const res = await fetch(`/api/results?client_id=${cId}&include_details=true`)
      const data = await res.json()

      if (!Array.isArray(data)) {
        setExistingResults({})
        return
      }

      const exerciseIds = new Set(
        workoutsList.flatMap((workoutItem: any) => (workoutItem.exercises || []).map((exercise: any) => exercise.id))
      )
      const latestResults = new Map<string, any>()

      data.forEach((row: any) => {
        if (row.workout_date !== date) return
        if (!exerciseIds.has(row.exercise_id)) return

        const current = latestResults.get(row.exercise_id)
        if (!current || new Date(row.created_at) > new Date(current.created_at)) {
          latestResults.set(row.exercise_id, row)
        }
      })

      const mapped = Object.fromEntries(
        Array.from(latestResults.entries()).map(([exerciseId, row]) => [
          exerciseId,
          { id: row.id, value: row.value || '', notes: row.notes || '', rpe: row.rpe ? String(row.rpe) : '' },
        ])
      )

      const serverState = Object.fromEntries(
        Object.entries(mapped).map(([exerciseId, item]) => [
          exerciseId,
          { value: item.value, notes: item.notes, rpe: item.rpe },
        ])
      )
      const draftState = loadDraftFromStorage(cId, date)

      setExistingResults(mapped)
      setFormState(() => ({
        ...serverState,
        ...draftState,
      }))
    } catch (error) {
      console.error('Failed to fetch existing results:', error)
      setExistingResults({})
    }
  }

  const fetchAttendedCount = async (cId: string) => {
    try {
      const res = await fetch(`/api/checkins?client_id=${cId}`)
      const data = await res.json()
      setAttendedCount(typeof data?.count === 'number' ? data.count : 0)
    } catch (error) {
      console.error('Failed to fetch attended count:', error)
    }
  }

  const loadWorkoutForDate = async (cId: string, date: string) => {
    try {
      const coachSlug = localStorage.getItem('athletepro_coach_slug')
      const workoutsUrl = coachSlug
        ? `/api/workouts?date=${date}&include_exercises=true&coach=${encodeURIComponent(coachSlug)}`
        : `/api/workouts?date=${date}&include_exercises=true`

      const [checkinRes, workoutsRes] = await Promise.all([
        fetch(`/api/checkins?client_id=${cId}&date=${date}`),
        fetch(workoutsUrl),
      ])
      const checkinData = await checkinRes.json()
      const dayWorkouts = await workoutsRes.json()

      setHasWorkoutToday(Array.isArray(dayWorkouts) && dayWorkouts.length > 0)

      const checkedInWorkoutIds = new Set(
        Array.isArray(checkinData) ? checkinData.map((checkin: any) => checkin.workout_id) : []
      )
      const matched = Array.isArray(dayWorkouts)
        ? dayWorkouts.filter((workoutItem: any) => checkedInWorkoutIds.has(workoutItem.id))
        : []

      setCheckedInWorkouts(matched)

      if (matched.length > 0) {
        await fetchExistingResults(cId, matched, date)
      } else {
        setExistingResults({})
      }

      await fetchAttendedCount(cId)
    } catch (error) {
      console.error('Failed to fetch workout:', error)
    }
  }

  const handleFieldChange = (exerciseId: string, field: keyof ExerciseFormState, value: string) => {
    setFormState((prev) => {
      const nextState = {
        ...prev,
        [exerciseId]: {
          ...(prev[exerciseId] || { value: '', notes: '', rpe: '' }),
          [field]: value,
        },
      }

      if (clientId) {
        saveDraftToStorage(clientId, selectedDate, nextState)
      }

      return nextState
    })
  }

  const handleTextareaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    currentValue: string,
    onChange: (value: string) => void
  ) => {
    if (event.key !== 'Tab') return

    event.preventDefault()
    const target = event.currentTarget
    const start = target.selectionStart ?? currentValue.length
    const end = target.selectionEnd ?? currentValue.length
    const nextValue = `${currentValue.slice(0, start)}\t${currentValue.slice(end)}`

    onChange(nextValue)

    requestAnimationFrame(() => {
      target.selectionStart = start + 1
      target.selectionEnd = start + 1
    })
  }

  const handleAddResult = async (exerciseId: string) => {
    if (!clientId) return

    const entry = formState[exerciseId] || { value: '', notes: '', rpe: '' }
    if (!entry.value.trim()) {
      setFeedback((prev) => ({
        ...prev,
        [exerciseId]: { kind: 'error', message: 'Zadej výsledek před uložením.' },
      }))
      return
    }

    setSubmittingExerciseId(exerciseId)

    const existingResult = existingResults[exerciseId]

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: exerciseId,
          client_id: clientId,
          value: entry.value,
          notes: entry.notes || null,
          rpe: entry.rpe || null,
          result_id: existingResult?.id || null,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save result')
      }

      const savedResult = await res.json()
      setExistingResults((prev) => ({
        ...prev,
        [exerciseId]: {
          id: savedResult.id,
          value: savedResult.value || entry.value,
          notes: savedResult.notes || '',
          rpe: savedResult.rpe ? String(savedResult.rpe) : '',
        },
      }))
      setFeedback((prev) => ({
        ...prev,
        [exerciseId]: { kind: 'success', message: existingResult ? 'Výsledek upraven.' : 'Výsledek uložen.' },
      }))
      setFormState((prev) => {
        const nextState = {
          ...prev,
          [exerciseId]: {
            value: entry.value,
            notes: entry.notes || '',
            rpe: entry.rpe || '',
          },
        }

        if (clientId) {
          saveDraftToStorage(clientId, selectedDate, nextState)
        }

        return nextState
      })
    } catch (error) {
      console.error('Failed to add result:', error)
      setFeedback((prev) => ({
        ...prev,
        [exerciseId]: { kind: 'error', message: existingResult ? 'Nepodařilo se upravit výsledek.' : 'Nepodařilo se uložit výsledek.' },
      }))
    } finally {
      setSubmittingExerciseId(null)
    }
  }

  const handleLogout = () => {
    if (clientId) {
      localStorage.removeItem(getDraftStorageKey(clientId, selectedDate))
    }
    localStorage.removeItem('athletepro_client_id')
    localStorage.removeItem('athletepro_client_token')
    localStorage.removeItem('athletepro_client_name')
    localStorage.removeItem('athletepro_coach_slug')
    router.push('/client')
  }

  const getResultLabel = (resultType: string) => {
    switch (resultType) {
      case 'reps':
        return 'Počet opakování'
      case 'weight':
        return 'Váha'
      case 'time':
        return 'Čas'
      case 'distance':
        return 'Vzdálenost'
      case 'rounds':
        return 'Počet kol'
      default:
        return 'Výsledek'
    }
  }

  const getResultPlaceholder = (resultType: string) => {
    switch (resultType) {
      case 'reps':
        return 'např. 10'
      case 'weight':
        return 'např. 80kg'
      case 'time':
        return 'např. 03:30'
      case 'distance':
        return 'např. 2.4km'
      case 'rounds':
        return 'např. 4'
      default:
        return 'Zadej výsledek'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám trénink...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-2xl mx-auto py-4 px-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Trénink</h1>
            <p className="text-sm text-gray-600">Přihlášený klient: {clientName}</p>
            <p className="text-xs text-gray-500 mt-0.5">Odtrénováno: {formatWorkoutCount(attendedCount)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/client/history"
              className="text-sm bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 whitespace-nowrap"
            >
              Historie
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Odhlásit se
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <HorizontalCalendar
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            markedDates={workoutDates}
          />
        </div>

        {workoutLoading && (
          <p className="text-center text-xs text-gray-400">Aktualizuji...</p>
        )}

        {checkedInWorkouts.length > 0 ? (
          checkedInWorkouts.map((workout: any) => (
            <div key={workout.id} className="bg-white rounded-lg shadow p-6 space-y-6">
              <div className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{workout.name}</h2>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Popis tréninku</p>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {workout.description?.trim() ? workout.description : 'Trenér zatím nepřidal žádný popis.'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                {workout.exercises && workout.exercises.length > 0 ? (
                  workout.exercises.map((exercise: any) => {
                    const currentState = formState[exercise.id] || { value: '', notes: '', rpe: '' }
                    const currentFeedback = feedback[exercise.id]
                    const existingResult = existingResults[exercise.id]

                    return (
                      <div key={exercise.id} className="border rounded-lg p-4 space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{exercise.name}</h3>
                            <span className="text-xs uppercase tracking-wide text-gray-500">
                              {exercise.result_type}
                            </span>
                          </div>
                          {exercise.description?.trim() ? (
                            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{exercise.description}</p>
                            </div>
                          ) : null}
                        </div>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            void handleAddResult(exercise.id)
                          }}
                          className="space-y-3"
                        >
                          <label className="block text-sm font-medium text-gray-700">
                            <span className="mb-1 block">{getResultLabel(exercise.result_type)}</span>
                            <input
                              type="text"
                              value={currentState.value}
                              onChange={(e) => handleFieldChange(exercise.id, 'value', e.target.value)}
                              placeholder={getResultPlaceholder(exercise.result_type)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </label>

                          <label className="block text-sm font-medium text-gray-700">
                            <span className="mb-1 block">RPE (volitelné, 1–10)</span>
                            <select
                              value={currentState.rpe}
                              onChange={(e) => handleFieldChange(exercise.id, 'rpe', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                              <option value="">Nezadáno</option>
                              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block text-sm font-medium text-gray-700">
                            <span className="mb-1 block">Poznámky</span>
                            <textarea
                              value={currentState.notes}
                              onChange={(e) => handleFieldChange(exercise.id, 'notes', e.target.value)}
                              onKeyDown={(e) => handleTextareaKeyDown(e, currentState.notes, (value) => handleFieldChange(exercise.id, 'notes', value))}
                              placeholder="Dodatečné poznámky"
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </label>

                          <div className="flex items-center gap-3">
                            <button
                              type="submit"
                              disabled={submittingExerciseId === exercise.id}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {submittingExerciseId === exercise.id
                                ? 'Ukládám...'
                                : existingResult ? 'Upravit výsledek' : 'Uložit výsledek'}
                            </button>
                            {currentFeedback && (
                              <p className={currentFeedback.kind === 'success' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                                {currentFeedback.message}
                              </p>
                            )}
                          </div>
                        </form>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-gray-500">Pro tento trénink zatím nejsou přidány žádné cviky.</p>
                )}
              </div>
            </div>
          ))
        ) : hasWorkoutToday ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
            <p className="text-sm text-yellow-800">
              Dnes je naplánovaný trénink, ale trenér tě na něj zatím nepřihlásil. Ozvi se mu, ať tě přidá, a pak se sem vrať.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-lg text-gray-600">Pro tento den nemáš naplánovaný trénink 😎</p>
          </div>
        )}
      </main>
    </div>
  )
}
