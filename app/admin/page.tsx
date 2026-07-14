'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HorizontalCalendar, { toDateString } from '@/components/HorizontalCalendar'
import ConfirmModal from '@/components/ConfirmModal'

type ExerciseInput = {
  name: string
  description: string
  result_type: 'reps' | 'weight' | 'time' | 'distance' | 'rounds' | 'custom'
}

function getWorkoutTypeLabel(workout: any) {
  if (workout.workout_type === 'individual') {
    return `Individuální${workout.assigned_client_name ? `: ${workout.assigned_client_name}` : ''}`
  }
  return workout.training_group_code || workout.training_group_name || 'Skupina'
}

export default function AdminDashboard() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [workoutLoading, setWorkoutLoading] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientCode, setNewClientCode] = useState('')
  const [newClientGroupIds, setNewClientGroupIds] = useState<string[]>([])
  const [newWorkoutName, setNewWorkoutName] = useState('')
  const [newWorkoutDescription, setNewWorkoutDescription] = useState('')
  const [newWorkoutDate, setNewWorkoutDate] = useState(toDateString(new Date()))
  const [newWorkoutType, setNewWorkoutType] = useState<'group' | 'individual'>('group')
  const [newWorkoutGroupId, setNewWorkoutGroupId] = useState('')
  const [newWorkoutClientId, setNewWorkoutClientId] = useState('')
  const [workoutFormError, setWorkoutFormError] = useState<string | null>(null)
  const [trainingGroups, setTrainingGroups] = useState<any[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCode, setNewGroupCode] = useState('')
  const [groupFormError, setGroupFormError] = useState<string | null>(null)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [exercises, setExercises] = useState<ExerciseInput[]>([{ name: '', description: '', result_type: 'reps' }])
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const [editingResultId, setEditingResultId] = useState<string | null>(null)
  const [editingResultValue, setEditingResultValue] = useState('')
  const [editingResultNotes, setEditingResultNotes] = useState('')
  const [editingResultRpe, setEditingResultRpe] = useState('')
  const [updatingResultId, setUpdatingResultId] = useState<string | null>(null)
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()))
  const [dayAttendance, setDayAttendance] = useState<Record<string, { checkins: any[]; results: any[] }>>({})
  const [dayLoading, setDayLoading] = useState(false)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const [clientCheckinCounts, setClientCheckinCounts] = useState<Record<string, number>>({})
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [coach, setCoach] = useState<{ name: string; email: string; slug: string } | null>(null)

  const selectedDayWorkouts = workouts.filter((workout) => workout.date === selectedDate)
  const selectedDayWorkoutIds = selectedDayWorkouts.map((workout) => workout.id).join(',')
  const workoutDates = workouts.map((workout) => workout.date)

  useEffect(() => {
    fetchClients()
    fetchWorkouts()
    fetchClientCheckinCounts()
    fetchTrainingGroups()
    fetchCoach()
  }, [])

  const fetchCoach = async () => {
    try {
      const res = await fetch('/api/admin/me')
      if (!res.ok) return
      const data = await res.json()
      setCoach(data)
    } catch (error) {
      console.error('Failed to fetch coach:', error)
    }
  }

  useEffect(() => {
    const ids = selectedDayWorkoutIds ? selectedDayWorkoutIds.split(',') : []
    if (ids.length === 0) {
      setDayAttendance({})
      return
    }
    fetchDayAttendanceForWorkouts(ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayWorkoutIds])


  const fetchClientCheckinCounts = async () => {
    try {
      const res = await fetch('/api/checkins?count_by_client=true')
      const data = await res.json()

      if (!Array.isArray(data)) return

      setClientCheckinCounts(
        Object.fromEntries(data.map((row: any) => [row.client_id, row.count]))
      )
    } catch (error) {
      console.error('Failed to fetch client checkin counts:', error)
    }
  }

  const fetchDayAttendanceForWorkouts = async (workoutIds: string[]) => {
    setDayLoading(true)
    try {
      const entries = await Promise.all(
        workoutIds.map(async (workoutId) => {
          const [checkinsRes, resultsRes] = await Promise.all([
            fetch(`/api/checkins?workout_id=${workoutId}`),
            fetch(`/api/results?workout_id=${workoutId}&include_details=true`),
          ])
          const checkinsData = await checkinsRes.json()
          const resultsData = await resultsRes.json()
          return [
            workoutId,
            {
              checkins: Array.isArray(checkinsData) ? checkinsData : [],
              results: Array.isArray(resultsData) ? resultsData : [],
            },
          ] as const
        })
      )
      setDayAttendance(Object.fromEntries(entries))
    } catch (error) {
      console.error('Failed to fetch day attendance:', error)
    } finally {
      setDayLoading(false)
    }
  }

  const handleToggleCheckin = async (workoutId: string, clientId: string, isCheckedIn: boolean) => {
    const key = `${workoutId}:${clientId}`
    setTogglingKey(key)
    try {
      const res = await fetch('/api/checkins', {
        method: isCheckedIn ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout_id: workoutId, client_id: clientId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        window.alert(data?.error || 'Nepodařilo se změnit docházku.')
        return
      }

      await fetchDayAttendanceForWorkouts(selectedDayWorkouts.map((workout) => workout.id))
      await fetchClientCheckinCounts()
    } catch (error) {
      console.error('Failed to toggle checkin:', error)
    } finally {
      setTogglingKey(null)
    }
  }

  const handleCreateWorkoutForSelectedDate = () => {
    setEditingWorkoutId(null)
    setNewWorkoutName('')
    setNewWorkoutDescription('')
    setNewWorkoutDate(selectedDate)
    setNewWorkoutType('group')
    setNewWorkoutGroupId('')
    setNewWorkoutClientId('')
    setExercises([{ name: '', description: '', result_type: 'reps' }])
    document.getElementById('workout-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      setClients(data)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  const fetchWorkouts = async () => {
    try {
      const res = await fetch('/api/workouts?include_exercises=true')
      const data = await res.json()
      setWorkouts(data)
    } catch (error) {
      console.error('Failed to fetch workouts:', error)
    }
  }

  const fetchTrainingGroups = async () => {
    try {
      const res = await fetch('/api/training-groups')
      const data = await res.json()
      if (Array.isArray(data)) {
        setTrainingGroups(data)
      }
    } catch (error) {
      console.error('Failed to fetch training groups:', error)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingGroup(true)
    setGroupFormError(null)

    try {
      const res = await fetch('/api/training-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim(), code: newGroupCode.trim() || null }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setGroupFormError(data?.error || 'Nepodařilo se vytvořit skupinu.')
        return
      }

      setNewGroupName('')
      setNewGroupCode('')
      await fetchTrainingGroups()
    } catch (error) {
      console.error('Failed to create training group:', error)
      setGroupFormError('Nepodařilo se vytvořit skupinu.')
    } finally {
      setCreatingGroup(false)
    }
  }

  const resetWorkoutForm = () => {
    setEditingWorkoutId(null)
    setNewWorkoutName('')
    setNewWorkoutDescription('')
    setNewWorkoutDate(toDateString(new Date()))
    setNewWorkoutType('group')
    setNewWorkoutGroupId('')
    setNewWorkoutClientId('')
    setWorkoutFormError(null)
    setExercises([{ name: '', description: '', result_type: 'reps' }])
  }

  const handleEditWorkout = (workout: any) => {
    setEditingWorkoutId(workout.id)
    setNewWorkoutName(workout.name || '')
    setNewWorkoutDescription(workout.description || '')
    setNewWorkoutDate(workout.date || toDateString(new Date()))
    setNewWorkoutType(workout.workout_type || 'group')
    setNewWorkoutGroupId(workout.training_group_id || '')
    setNewWorkoutClientId(workout.client_id || '')
    setExercises(
      Array.isArray(workout.exercises) && workout.exercises.length > 0
        ? workout.exercises.map((exercise: any) => ({
            name: exercise.name || '',
            description: exercise.description || '',
            result_type: exercise.result_type || 'reps',
          }))
        : [{ name: '', description: '', result_type: 'reps' }]
    )
  }

  const handleCancelEdit = () => {
    resetWorkoutForm()
  }

  const handleDuplicateWorkout = (workout: any) => {
    setEditingWorkoutId(null)
    setNewWorkoutName(workout.name || '')
    setNewWorkoutDescription(workout.description || '')
    setNewWorkoutDate(selectedDate)
    setNewWorkoutType(workout.workout_type || 'group')
    setNewWorkoutGroupId(workout.training_group_id || '')
    setNewWorkoutClientId(workout.client_id || '')
    setExercises(
      Array.isArray(workout.exercises) && workout.exercises.length > 0
        ? workout.exercises.map((exercise: any) => ({
            name: exercise.name || '',
            description: exercise.description || '',
            result_type: exercise.result_type || 'reps',
          }))
        : [{ name: '', description: '', result_type: 'reps' }]
    )
    document.getElementById('workout-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClientName, code: newClientCode, training_group_ids: newClientGroupIds }),
      })

      if (res.ok) {
        setNewClientName('')
        setNewClientCode('')
        setNewClientGroupIds([])
        fetchClients()
      }
    } catch (error) {
      console.error('Failed to add client:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateExercise = (index: number, field: keyof ExerciseInput, value: string) => {
    setExercises((prev) =>
      prev.map((exercise, exerciseIndex) => {
        if (exerciseIndex !== index) return exercise
        return {
          ...exercise,
          [field]: value,
        }
      })
    )
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

  const handleAddExercise = () => {
    setExercises((prev) => [...prev, { name: '', description: '', result_type: 'reps' }])
  }

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, exerciseIndex) => exerciseIndex !== index))
  }

  const handleCreateWorkout = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newWorkoutType === 'individual' && !newWorkoutClientId) {
      setWorkoutFormError('Vyber klienta pro individuální trénink.')
      return
    }

    if (newWorkoutType === 'group' && !newWorkoutGroupId) {
      setWorkoutFormError('Vyber tréninkovou skupinu.')
      return
    }

    setWorkoutFormError(null)
    setWorkoutLoading(true)

    const payloadExercises = exercises
      .filter((exercise) => exercise.name.trim())
      .map((exercise, index) => ({
        name: exercise.name.trim(),
        description: exercise.description.trim(),
        result_type: exercise.result_type,
        order: index,
      }))

    try {
      const res = await fetch('/api/workouts', {
        method: editingWorkoutId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingWorkoutId,
          name: newWorkoutName,
          description: newWorkoutDescription,
          date: newWorkoutDate,
          workout_type: newWorkoutType,
          training_group_id: newWorkoutType === 'group' ? newWorkoutGroupId : null,
          client_id: newWorkoutType === 'individual' ? newWorkoutClientId : null,
          exercises: payloadExercises,
        }),
      })

      if (res.ok) {
        resetWorkoutForm()
        fetchWorkouts()
        fetchClientCheckinCounts()
      } else {
        const data = await res.json().catch(() => null)
        setWorkoutFormError(data?.error || 'Nepodařilo se uložit trénink.')
      }
    } catch (error) {
      console.error('Failed to create workout:', error)
      setWorkoutFormError('Nepodařilo se uložit trénink.')
    } finally {
      setWorkoutLoading(false)
    }
  }

  const handleDeleteWorkout = (workoutId: string) => {
    setConfirmModal({
      title: 'Smazat trénink',
      message: 'Opravdu chceš smazat tento trénink?',
      onConfirm: () => void performDeleteWorkout(workoutId),
    })
  }

  const performDeleteWorkout = async (workoutId: string) => {
    setConfirmModal(null)

    try {
      const res = await fetch('/api/workouts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workoutId }),
      })

      if (res.ok) {
        fetchWorkouts()
      }
    } catch (error) {
      console.error('Failed to delete workout:', error)
    }
  }

  const handleDeleteClient = (clientId: string) => {
    setConfirmModal({
      title: 'Smazat klienta',
      message: 'Opravdu chceš smazat tohoto klienta? Smažou se i jeho výsledky a docházka.',
      onConfirm: () => void performDeleteClient(clientId),
    })
  }

  const performDeleteClient = async (clientId: string) => {
    setConfirmModal(null)
    setDeletingClientId(clientId)

    try {
      const res = await fetch('/api/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId }),
      })

      if (!res.ok) {
        throw new Error('Failed to delete client')
      }

      await fetchClients()
      await fetchClientCheckinCounts()
    } catch (error) {
      console.error('Failed to delete client:', error)
    } finally {
      setDeletingClientId(null)
    }
  }

  const handleStartEditResult = (result: any) => {
    setEditingResultId(result.id)
    setEditingResultValue(result.value || '')
    setEditingResultNotes(result.notes || '')
    setEditingResultRpe(result.rpe ? String(result.rpe) : '')
  }

  const handleCancelEditResult = () => {
    setEditingResultId(null)
    setEditingResultValue('')
    setEditingResultNotes('')
    setEditingResultRpe('')
  }

  const handleSaveResultEdit = async (resultId: string) => {
    setUpdatingResultId(resultId)

    try {
      const res = await fetch('/api/results', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resultId,
          value: editingResultValue.trim(),
          notes: editingResultNotes.trim() || null,
          rpe: editingResultRpe || null,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update result')
      }

      setEditingResultId(null)
      setEditingResultValue('')
      setEditingResultNotes('')
      await fetchDayAttendanceForWorkouts(selectedDayWorkouts.map((workout) => workout.id))
    } catch (error) {
      console.error('Failed to edit result:', error)
    } finally {
      setUpdatingResultId(null)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch (error) {
      console.error('Failed to logout:', error)
    } finally {
      router.push('/admin/login')
      router.refresh()
    }
  }

  const handleDeleteResult = (resultId: string) => {
    setConfirmModal({
      title: 'Smazat výsledek',
      message: 'Opravdu chceš smazat tento výsledek?',
      onConfirm: () => void performDeleteResult(resultId),
    })
  }

  const performDeleteResult = async (resultId: string) => {
    setConfirmModal(null)
    setDeletingResultId(resultId)

    try {
      const res = await fetch('/api/results', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resultId }),
      })

      if (!res.ok) {
        throw new Error('Failed to delete result')
      }

      await fetchDayAttendanceForWorkouts(selectedDayWorkouts.map((workout) => workout.id))
    } catch (error) {
      console.error('Failed to delete result:', error)
    } finally {
      setDeletingResultId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AthletePro Admin</h1>
            {coach && (
              <p className="text-sm text-gray-500 mt-1">
                {coach.name} · Odkaz pro klienty: <span className="font-mono">/client?coach={coach.slug}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => void handleLogout()}
            className="text-sm bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Odhlásit se
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Trénink podle dne</h2>

          <HorizontalCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            markedDates={workoutDates}
          />

          <div className="mt-4 space-y-4">
            {selectedDayWorkouts.length === 0 ? (
              <p className="text-gray-500">Pro tento den není naplánovaný žádný trénink.</p>
            ) : (
              selectedDayWorkouts.map((workout) => {
                const attendance = dayAttendance[workout.id] || { checkins: [], results: [] }

                return (
                  <div key={workout.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{workout.name}</p>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {getWorkoutTypeLabel(workout)}
                        </span>
                      </div>
                      {workout.description?.trim() ? (
                        <p className="text-sm text-gray-600 mt-1">{workout.description}</p>
                      ) : null}
                    </div>

                    {dayLoading ? (
                      <p className="text-sm text-gray-500">Načítám docházku...</p>
                    ) : (
                      <div className="space-y-2">
                        {clients.map((client) => {
                          const isCheckedIn = attendance.checkins.some((checkin) => checkin.client_id === client.id)
                          const clientDayResults = attendance.results.filter((r) => r.client_id === client.id)
                          const toggleKey = `${workout.id}:${client.id}`

                          return (
                            <div key={client.id} className="border border-gray-200 rounded p-3">
                              <label className="flex items-center justify-between gap-3 cursor-pointer">
                                <span className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isCheckedIn}
                                    disabled={togglingKey === toggleKey}
                                    onChange={() => void handleToggleCheckin(workout.id, client.id, isCheckedIn)}
                                    className="h-4 w-4"
                                  />
                                  <span className="font-medium">{client.name}</span>
                                </span>
                                <span className="text-xs text-gray-500">
                                  {isCheckedIn ? 'Přihlášen' : 'Nepřihlášen'}
                                </span>
                              </label>

                              {isCheckedIn && (
                                <div className="mt-3 pl-6 space-y-2">
                                  {clientDayResults.length === 0 ? (
                                    <p className="text-sm text-gray-500">Zatím nezapsal žádný výsledek.</p>
                                  ) : (
                                    clientDayResults.map((result) => {
                                      const isEditingThisResult = editingResultId === result.id

                                      return (
                                        <div key={result.id} className="rounded border border-gray-200 bg-white p-2">
                                          {isEditingThisResult ? (
                                            <div className="space-y-2">
                                              <p className="text-sm font-medium">{result.exercise_name}</p>
                                              <input
                                                type="text"
                                                value={editingResultValue}
                                                onChange={(e) => setEditingResultValue(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                              />
                                              <textarea
                                                rows={2}
                                                value={editingResultNotes}
                                                onChange={(e) => setEditingResultNotes(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="Poznámka"
                                              />
                                              <select
                                                value={editingResultRpe}
                                                onChange={(e) => setEditingResultRpe(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                              >
                                                <option value="">RPE: nezadáno</option>
                                                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                                                  <option key={value} value={value}>
                                                    RPE: {value}
                                                  </option>
                                                ))}
                                              </select>
                                              <div className="flex gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => void handleSaveResultEdit(result.id)}
                                                  disabled={updatingResultId === result.id}
                                                  className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                                                >
                                                  {updatingResultId === result.id ? 'Ukládám...' : 'Uložit'}
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={handleCancelEditResult}
                                                  className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                >
                                                  Zrušit
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-sm space-y-1">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="flex flex-wrap items-center gap-2">
                                                  <span className="font-medium">{result.exercise_name}:</span>
                                                  <span>{result.value}</span>
                                                  {result.rpe ? <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-700">RPE {result.rpe}</span> : null}
                                                  {result.notes ? <span className="text-gray-500">({result.notes})</span> : null}
                                                </span>
                                                <span className="flex items-center gap-2 whitespace-nowrap">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleStartEditResult(result)}
                                                    className="text-blue-600 hover:text-blue-700"
                                                  >
                                                    Upravit
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => void handleDeleteResult(result.id)}
                                                    disabled={deletingResultId === result.id}
                                                    className="text-red-600 hover:text-red-700 disabled:opacity-50"
                                                  >
                                                    {deletingResultId === result.id ? 'Mazání...' : 'Smazat'}
                                                  </button>
                                                </span>
                                              </div>
                                              {result.exercise_description?.trim() ? (
                                                <p className="text-xs text-gray-500 whitespace-pre-wrap break-words">{result.exercise_description}</p>
                                              ) : null}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            <button
              type="button"
              onClick={handleCreateWorkoutForSelectedDate}
              className="whitespace-nowrap text-sm bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
            >
              {selectedDayWorkouts.length === 0 ? 'Vytvořit trénink na tento den' : '+ Přidat další trénink na tento den'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Tréninkové skupiny</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              {trainingGroups.length === 0 ? (
                <p className="text-sm text-gray-500">Zatím žádné skupiny.</p>
              ) : (
                trainingGroups.map((group) => (
                  <div key={group.id} className="border border-gray-200 rounded p-3">
                    <p className="font-medium">{group.name}</p>
                    {group.code ? <p className="text-sm text-gray-500">Kód: {group.code}</p> : null}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                placeholder="Název skupiny (např. Pokročilí čtvrtek)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                placeholder="Krátký kód (volitelné, např. POKR)"
                value={newGroupCode}
                onChange={(e) => setNewGroupCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              {groupFormError && <p className="text-sm text-red-600">{groupFormError}</p>}
              <button
                type="submit"
                disabled={creatingGroup}
                className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {creatingGroup ? 'Vytvářím...' : '+ Nová skupina'}
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Přidat klienta</h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <input
                type="text"
                placeholder="Jméno klienta"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                placeholder="Přístupový kód"
                value={newClientCode}
                onChange={(e) => setNewClientCode(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <div className="space-y-1">
                <span className="block text-sm font-medium text-gray-700">Tréninkové skupiny</span>
                {trainingGroups.length === 0 ? (
                  <p className="text-sm text-gray-500">Zatím žádné skupiny.</p>
                ) : (
                  trainingGroups.map((group) => (
                    <label key={group.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={newClientGroupIds.includes(group.id)}
                        onChange={(e) =>
                          setNewClientGroupIds((prev) =>
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
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Přidávám...' : 'Přidat klienta'}
              </button>
            </form>
          </div>

          <div id="workout-form" className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingWorkoutId ? 'Upravit trénink' : 'Vytvořit trénink'}
            </h2>
            <form onSubmit={handleCreateWorkout} className="space-y-4">
              <input
                type="text"
                placeholder="Název tréninku"
                value={newWorkoutName}
                onChange={(e) => setNewWorkoutName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <textarea
                rows={3}
                placeholder="Popis tréninku"
                value={newWorkoutDescription}
                onChange={(e) => setNewWorkoutDescription(e.target.value)}
                onKeyDown={(e) => handleTextareaKeyDown(e, newWorkoutDescription, setNewWorkoutDescription)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="date"
                value={newWorkoutDate}
                onChange={(e) => setNewWorkoutDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-1 block">Typ tréninku</span>
                  <select
                    value={newWorkoutType}
                    onChange={(e) => setNewWorkoutType(e.target.value as 'group' | 'individual')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="group">Lekce (tréninková skupina)</option>
                    <option value="individual">Individuální trénink</option>
                  </select>
                </label>

                {newWorkoutType === 'group' && (
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="mb-1 block">Tréninková skupina</span>
                    <select
                      value={newWorkoutGroupId}
                      onChange={(e) => setNewWorkoutGroupId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">-- Vybrat skupinu --</option>
                      {trainingGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {newWorkoutType === 'individual' && (
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="mb-1 block">Klient</span>
                    <select
                      value={newWorkoutClientId}
                      onChange={(e) => setNewWorkoutClientId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">-- Vybrat klienta --</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Cviky</h3>
                  <button
                    type="button"
                    onClick={handleAddExercise}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Přidat cvik
                  </button>
                </div>

                {exercises.map((exercise, index) => (
                  <div key={index} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder={`Název cviku ${index + 1}`}
                        value={exercise.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      />
                      {exercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Odebrat
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      placeholder={`Popis cviku ${index + 1}`}
                      value={exercise.description}
                      onChange={(e) => updateExercise(index, 'description', e.target.value)}
                      onKeyDown={(e) => handleTextareaKeyDown(e, exercise.description, (value) => updateExercise(index, 'description', value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <select
                      value={exercise.result_type}
                      onChange={(e) => updateExercise(index, 'result_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="reps">Počet opakování</option>
                      <option value="weight">Váha</option>
                      <option value="time">Čas</option>
                      <option value="distance">Vzdálenost</option>
                      <option value="rounds">Počet kol</option>
                      <option value="custom">Vlastní</option>
                    </select>
                  </div>
                ))}
              </div>

              {workoutFormError && <p className="text-sm text-red-600">{workoutFormError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={workoutLoading}
                  className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {workoutLoading
                    ? editingWorkoutId ? 'Ukládám...' : 'Vytvářím...'
                    : editingWorkoutId ? 'Uložit změny' : 'Vytvořit trénink'}
                </button>
                {editingWorkoutId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Zrušit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Klienti ({clients.length})</h2>
            <div className="space-y-2">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center justify-between border border-gray-200 rounded p-3">
                  <Link href={`/admin/clients/${client.id}`} className="flex-1 hover:opacity-80">
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-gray-500">
                      Kód: {client.code} · Tréninky: {clientCheckinCounts[client.id] || 0}
                      {Array.isArray(client.training_groups) && client.training_groups.length > 0
                        ? ` · Skupiny: ${client.training_groups.map((g: any) => g.name).join(', ')}`
                        : ''}
                    </p>
                  </Link>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Detail
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDeleteClient(client.id)}
                      disabled={deletingClientId === client.id}
                      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingClientId === client.id ? 'Mazání...' : 'Smazat'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Tréninky ({workouts.length})</h2>
            <div className="space-y-3">
              {workouts.map((workout) => (
                <div key={workout.id} className="border border-gray-200 rounded p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{workout.name}</p>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {getWorkoutTypeLabel(workout)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{workout.description || 'Bez popisu'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditWorkout(workout)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Upravit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateWorkout(workout)}
                        className="text-sm text-gray-600 hover:text-gray-700"
                      >
                        Duplikovat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWorkout(workout.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Smazat
                      </button>
                      <span className="text-xs text-gray-500">{workout.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  )
}
