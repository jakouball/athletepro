'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ConfirmModal'

type Coach = {
  id: string
  name: string
  email: string
  slug: string | null
  coach_type: 'fitness' | 'football' | null
  client_count: number
  created_at: string
}

const COACH_TYPE_LABELS: Record<string, string> = {
  fitness: 'Fitness Coach',
  football: 'Football Coach',
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newCoachType, setNewCoachType] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editingCoachId, setEditingCoachId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editCoachType, setEditCoachType] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    const verify = async () => {
      const res = await fetch('/api/super-admin/me')
      if (!res.ok) {
        router.push('/super-admin/login')
        return
      }
      setCheckingAuth(false)
      fetchCoaches()
    }
    verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCoaches = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/coaches')
      const data = await res.json()
      if (Array.isArray(data)) {
        setCoaches(data)
      }
    } catch (error) {
      console.error('Failed to fetch coaches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/super-admin/logout', { method: 'POST' })
    } finally {
      router.push('/super-admin/login')
      router.refresh()
    }
  }

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/super-admin/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          slug: newSlug,
          coach_type: newCoachType || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setCreateError(data?.error || 'Nepodařilo se vytvořit trenéra.')
        return
      }

      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewSlug('')
      setNewCoachType('')
      await fetchCoaches()
    } catch (error) {
      console.error('Failed to create coach:', error)
      setCreateError('Nepodařilo se vytvořit trenéra.')
    } finally {
      setCreating(false)
    }
  }

  const handleStartEdit = (coach: Coach) => {
    setEditingCoachId(coach.id)
    setEditName(coach.name)
    setEditEmail(coach.email)
    setEditPassword('')
    setEditSlug(coach.slug || '')
    setEditCoachType(coach.coach_type || '')
    setUpdateError(null)
  }

  const handleCancelEdit = () => {
    setEditingCoachId(null)
    setUpdateError(null)
  }

  const handleSaveEdit = async (coachId: string) => {
    setUpdating(true)
    setUpdateError(null)

    try {
      const res = await fetch('/api/super-admin/coaches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coachId,
          name: editName,
          email: editEmail,
          password: editPassword || undefined,
          slug: editSlug,
          coach_type: editCoachType || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setUpdateError(data?.error || 'Nepodařilo se uložit změny.')
        return
      }

      setEditingCoachId(null)
      await fetchCoaches()
    } catch (error) {
      console.error('Failed to update coach:', error)
      setUpdateError('Nepodařilo se uložit změny.')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteCoach = (coach: Coach) => {
    setConfirmModal({
      title: 'Smazat trenéra',
      message: `Opravdu chceš smazat trenéra ${coach.name}? Smažou se i všichni jeho klienti, tréninky a výsledky.`,
      onConfirm: () => void performDeleteCoach(coach.id),
    })
  }

  const performDeleteCoach = async (coachId: string) => {
    setConfirmModal(null)
    setDeletingId(coachId)

    try {
      const res = await fetch('/api/super-admin/coaches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coachId }),
      })

      if (!res.ok) {
        throw new Error('Failed to delete coach')
      }

      await fetchCoaches()
    } catch (error) {
      console.error('Failed to delete coach:', error)
    } finally {
      setDeletingId(null)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Ověřuji přihlášení...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto py-6 px-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-ink">Super Admin</h1>
          <button
            onClick={() => void handleLogout()}
            className="text-sm bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700"
          >
            Odhlásit se
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-4 space-y-8">
        <div className="bg-surface rounded-3xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Přidat trenéra</h2>
          <form onSubmit={handleCreateCoach} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Jméno"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-2xl"
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-2xl"
            />
            <input
              type="password"
              placeholder="Heslo"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-2xl"
            />
            <input
              type="text"
              placeholder="Slug (volitelné, pro /client?coach=...)"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-2xl"
            />
            <select
              value={newCoachType}
              onChange={(e) => setNewCoachType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-2xl md:col-span-2"
            >
              <option value="">Typ trenéra: nezadáno</option>
              <option value="fitness">Fitness Coach</option>
              <option value="football">Football Coach</option>
            </select>

            {createError && <p className="text-sm text-red-600 md:col-span-2">{createError}</p>}

            <button
              type="submit"
              disabled={creating}
              className="md:col-span-2 bg-accent text-white py-3 rounded-full hover:bg-accent-strong disabled:opacity-50"
            >
              {creating ? 'Vytvářím...' : 'Vytvořit trenéra'}
            </button>
          </form>
        </div>

        <div className="bg-surface rounded-3xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Trenéři ({coaches.length})</h2>

          {loading ? (
            <p className="text-sm text-ink-muted">Načítám trenéry...</p>
          ) : coaches.length === 0 ? (
            <p className="text-sm text-ink-muted">Zatím žádní trenéři.</p>
          ) : (
            <div className="space-y-3">
              {coaches.map((coach) => {
                const isEditing = editingCoachId === coach.id

                return (
                  <div key={coach.id} className="border border-border rounded-2xl p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Jméno"
                            className="w-full px-3 py-2 border border-border rounded-2xl"
                          />
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full px-3 py-2 border border-border rounded-2xl"
                          />
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Nové heslo (nech prázdné pro zachování)"
                            className="w-full px-3 py-2 border border-border rounded-2xl"
                          />
                          <input
                            type="text"
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            placeholder="Slug"
                            className="w-full px-3 py-2 border border-border rounded-2xl"
                          />
                          <select
                            value={editCoachType}
                            onChange={(e) => setEditCoachType(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-2xl md:col-span-2"
                          >
                            <option value="">Typ trenéra: nezadáno</option>
                            <option value="fitness">Fitness Coach</option>
                            <option value="football">Football Coach</option>
                          </select>
                        </div>

                        {updateError && <p className="text-sm text-red-600">{updateError}</p>}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveEdit(coach.id)}
                            disabled={updating}
                            className="rounded-full bg-accent px-4 py-2 text-sm text-white hover:bg-accent-strong disabled:opacity-50"
                          >
                            {updating ? 'Ukládám...' : 'Uložit'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded-full border border-border px-4 py-2 text-sm text-ink hover:bg-surface-muted"
                          >
                            Zrušit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{coach.name}</p>
                            {coach.coach_type ? (
                              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-strong">
                                {COACH_TYPE_LABELS[coach.coach_type]}
                              </span>
                            ) : (
                              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-ink-muted">
                                Typ nenastaven
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-ink-muted mt-1">
                            {coach.email}
                            {coach.slug ? ` · slug: ${coach.slug}` : ''} · Klienti: {coach.client_count}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(coach)}
                            className="text-sm text-accent-strong hover:opacity-70"
                          >
                            Upravit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoach(coach)}
                            disabled={deletingId === coach.id}
                            className="text-sm text-red-600 hover:opacity-70 disabled:opacity-50"
                          >
                            {deletingId === coach.id ? 'Mazání...' : 'Smazat'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
