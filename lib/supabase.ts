import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types pro naši aplikaci
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
  description: string
  date: string
  coach_id: string
  exercises: Exercise[]
  created_at: string
}

export interface Exercise {
  id: string
  workout_id: string
  name: string
  result_type: 'reps' | 'weight' | 'time' | 'distance' | 'rounds' | 'custom'
  order: number
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

export interface Coach {
  id: string
  email: string
  name: string
}
