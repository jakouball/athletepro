import { Pool, types } from 'pg'

// DATE columns (oid 1082) by default get parsed into a JS Date at local
// midnight, which then serializes to a different calendar day in UTC
// (e.g. CEST midnight 2026-07-13 -> "2026-07-12T22:00:00.000Z"). Return
// the raw 'YYYY-MM-DD' string instead so date comparisons stay correct.
types.setTypeParser(1082, (value) => value)

// Managed Postgres providers (e.g. Supabase's pooler) present a cert chain
// that Node's strict verification rejects as "self-signed" in some runtimes
// (this is expected and it's what the provider itself recommends working
// around). Deliberately don't rely on `sslmode=require` in the URL for this:
// newer pg-connection-string versions treat that mode as an alias for
// verify-full and silently override the `ssl` option below with strict
// verification, defeating the point. Local Docker Postgres has no SSL, so
// only relax verification for anything that isn't localhost.
const connectionString = process.env.DATABASE_URL
const isLocalDb = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1')
const useSsl = Boolean(connectionString) && !isLocalDb

// PostgreSQL Pool
const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export async function query(text: string, params?: any[]) {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Executed query', { text, duration, rows: result.rowCount })
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

export async function getClient() {
  return pool.connect()
}

// TypeScript Types
export interface Coach {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Client {
  id: string
  name: string
  code: string
  coach_id: string
  created_at: string
}

export interface Workout {
  id: string
  name: string
  description?: string
  date: string
  coach_id: string
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  workout_id: string
  name: string
  result_type: 'reps' | 'weight' | 'time' | 'distance' | 'rounds' | 'custom'
  order: number
  created_at: string
}

export interface WorkoutResult {
  id: string
  exercise_id: string
  client_id: string
  value: string
  rpe?: number
  notes?: string
  created_at: string
}
