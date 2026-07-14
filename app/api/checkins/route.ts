import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminCoachId } from '@/lib/adminAuth'

// GET /api/checkins - podle parametru:
// ?workout_id=...            - seznam klientů přihlášených na trénink (admin, jen jeho vlastní trénink)
// ?client_id=...&date=...    - na které tréninky je klient ten den přihlášen (může jich být víc)
// ?client_id=...             - počet tréninků, na které se klient přihlásil
// ?count_by_client=true      - počty tréninků pro všechny klienty najednou (admin, jen jeho klienti)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workoutId = searchParams.get('workout_id')
    const clientId = searchParams.get('client_id')
    const date = searchParams.get('date')
    const countByClient = searchParams.get('count_by_client') === 'true'

    if (workoutId) {
      const coachId = getAdminCoachId(request)
      if (!coachId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const result = await query(
        `SELECT wc.id, wc.workout_id, wc.client_id, wc.created_at, c.name as client_name
         FROM workout_checkins wc
         JOIN clients c ON c.id = wc.client_id
         JOIN workouts w ON w.id = wc.workout_id
         WHERE wc.workout_id = $1 AND w.coach_id = $2
         ORDER BY c.name`,
        [workoutId, coachId]
      )

      return NextResponse.json(result.rows)
    }

    if (clientId && date) {
      const result = await query(
        `SELECT wc.id, wc.workout_id, wc.client_id, wc.created_at, w.name as workout_name, w.date as workout_date
         FROM workout_checkins wc
         JOIN workouts w ON w.id = wc.workout_id
         WHERE wc.client_id = $1 AND w.date = $2`,
        [clientId, date]
      )

      return NextResponse.json(result.rows)
    }

    if (clientId) {
      const result = await query(
        'SELECT COUNT(*)::int as count FROM workout_checkins WHERE client_id = $1',
        [clientId]
      )

      return NextResponse.json({ count: result.rows[0]?.count || 0 })
    }

    if (countByClient) {
      const coachId = getAdminCoachId(request)
      if (!coachId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const result = await query(
        `SELECT wc.client_id, COUNT(*)::int as count
         FROM workout_checkins wc
         JOIN clients c ON c.id = wc.client_id
         WHERE c.coach_id = $1
         GROUP BY wc.client_id`,
        [coachId]
      )

      return NextResponse.json(result.rows)
    }

    return NextResponse.json(
      { error: 'workout_id, client_id or count_by_client is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to fetch checkins:', error)
    return NextResponse.json({ error: 'Failed to fetch checkins' }, { status: 500 })
  }
}

// POST /api/checkins - trenér přihlásí klienta na trénink
export async function POST(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workout_id, client_id } = await request.json()

    if (!workout_id || !client_id) {
      return NextResponse.json({ error: 'workout_id and client_id are required' }, { status: 400 })
    }

    const ownership = await query(
      `SELECT
        (SELECT 1 FROM workouts WHERE id = $1 AND coach_id = $3) as owns_workout,
        (SELECT 1 FROM clients WHERE id = $2 AND coach_id = $3) as owns_client`,
      [workout_id, client_id, coachId]
    )

    if (!ownership.rows[0]?.owns_workout || !ownership.rows[0]?.owns_client) {
      return NextResponse.json({ error: 'Workout or client not found' }, { status: 404 })
    }

    const result = await query(
      `INSERT INTO workout_checkins (workout_id, client_id)
       VALUES ($1, $2)
       ON CONFLICT (workout_id, client_id) DO NOTHING
       RETURNING *`,
      [workout_id, client_id]
    )

    return NextResponse.json(result.rows[0] || { workout_id, client_id }, { status: 201 })
  } catch (error) {
    console.error('Failed to create checkin:', error)
    return NextResponse.json({ error: 'Failed to check in client' }, { status: 500 })
  }
}

// DELETE /api/checkins - trenér odhlásí klienta z tréninku
export async function DELETE(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workout_id, client_id } = await request.json()

    if (!workout_id || !client_id) {
      return NextResponse.json({ error: 'workout_id and client_id are required' }, { status: 400 })
    }

    await query(
      `DELETE FROM workout_checkins wc
       USING workouts w
       WHERE wc.workout_id = $1 AND wc.client_id = $2 AND wc.workout_id = w.id AND w.coach_id = $3`,
      [workout_id, client_id, coachId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete checkin:', error)
    return NextResponse.json({ error: 'Failed to check out client' }, { status: 500 })
  }
}
