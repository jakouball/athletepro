'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toDateString } from '@/components/HorizontalCalendar'

export default function ClientLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const coachSlug = searchParams.get('coach') || ''
  const [clients, setClients] = useState<any[]>([])
  const [code, setCode] = useState('')
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const url = coachSlug ? `/api/clients?coach=${encodeURIComponent(coachSlug)}` : '/api/clients'
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Chyba při načítání klientů')
        }
        const data = await response.json()
        setClients(data)
      } catch (err) {
        console.error('Failed to load clients:', err)
        setError('Nepodařilo se načíst seznam klientů. Zkus obnovit stránku.')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [coachSlug])

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId)
    setShowCodeInput(true)
    setLoginError(null)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)

    if (!selectedClient || !code) {
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient, code }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setLoginError('Kód není správný. Zkus to prosím znovu.')
          return
        }
        throw new Error('Chyba při ověřování přihlášení')
      }

      const data = await response.json()
      const selectedClientName = clients.find((client) => client.id === selectedClient)?.name || ''
      localStorage.setItem('athletepro_client_id', selectedClient)
      localStorage.setItem('athletepro_client_token', data.token)
      localStorage.setItem('athletepro_client_name', selectedClientName)
      localStorage.setItem('athletepro_coach_slug', coachSlug)
      router.push(`/client/workout/${toDateString(new Date())}`)
    } catch (err) {
      console.error('Failed to verify client login:', err)
      setLoginError('Nelze se přihlásit. Zkus to prosím později.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">AthletePro</h1>

        {loading ? (
          <p className="text-center text-gray-500">Načítám klienty...</p>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vyber své jméno
              </label>
              <select
                value={selectedClient || ''}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                required
              >
                <option value="">-- Vybrat --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {showCodeInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Přístupový kód
                </label>
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Zadej kód"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                />
              </div>
            )}

            {loginError && <p className="text-red-600 text-sm">{loginError}</p>}

            <button
              type="submit"
              disabled={!selectedClient || !code}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Přihlásit se
            </button>
          </form>
        )}

        <p className="text-center text-gray-500 text-sm mt-4">
          Máš otázky? Kontaktuj svého trenéra.
        </p>
      </div>
    </div>
  )
}
