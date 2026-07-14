import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminCoachId } from '@/lib/adminAuth'

// POST /api/results - uložení výsledku tréninku
export async function POST(request: NextRequest) {
  try {
    const { exercise_id, client_id, value, rpe, notes, result_id } = await request.json()

    if (!exercise_id || !client_id || !value) {
      return NextResponse.json(
        { error: 'exercise_id, client_id, and value are required' },
        { status: 400 }
      )
    }

    if (result_id) {
      const result = await query(
        'UPDATE workout_results SET value = $1, notes = $2, rpe = $3 WHERE id = $4 RETURNING *',
        [value, notes || null, rpe || null, result_id]
      )

      return NextResponse.json(result.rows[0], { status: 200 })
    }

    const result = await query(
      'INSERT INTO workout_results (exercise_id, client_id, value, rpe, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [exercise_id, client_id, value, rpe || null, notes || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Failed to save result:', error)
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 })
  }
}

// PUT /api/results - úprava existujícího výsledku
export async function PUT(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, value, notes, rpe } = await request.json()

    if (!id || !value) {
      return NextResponse.json(
        { error: 'id and value are required' },
        { status: 400 }
      )
    }

    const result = await query(
      `UPDATE workout_results wr
       SET value = $1, notes = $2, rpe = $3
       FROM exercises e, workouts w
       WHERE wr.id = $4 AND wr.exercise_id = e.id AND e.workout_id = w.id AND w.coach_id = $5
       RETURNING wr.*`,
      [value, notes || null, rpe || null, id, coachId]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0], { status: 200 })
  } catch (error) {
    console.error('Failed to update result:', error)
    return NextResponse.json({ error: 'Failed to update result' }, { status: 500 })
  }
}

// DELETE /api/results - odstranění výsledku
export async function DELETE(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const result = await query(
      `DELETE FROM workout_results wr
       USING exercises e, workouts w
       WHERE wr.id = $1 AND wr.exercise_id = e.id AND e.workout_id = w.id AND w.coach_id = $2
       RETURNING wr.*`,
      [id, coachId]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete result:', error)
    return NextResponse.json({ error: 'Failed to delete result' }, { status: 500 })
  }
}

// GET /api/results - výsledky klienta, nebo (s workout_id) výsledky všech klientů u tréninku
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const workoutId = searchParams.get('workout_id')
    const includeDetails = searchParams.get('include_details') === 'true' || searchParams.get('include_details') === '1'

    if (workoutId) {
      const coachId = getAdminCoachId(request)
      if (!coachId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const result = await query(
        `SELECT wr.*, e.name as exercise_name, e.description as exercise_description, e.result_type, c.name as client_name
         FROM workout_results wr
         JOIN exercises e ON e.id = wr.exercise_id
         JOIN clients c ON c.id = wr.client_id
         JOIN workouts w ON w.id = e.workout_id
         WHERE e.workout_id = $1 AND w.coach_id = $2
         ORDER BY wr.created_at DESC`,
        [workoutId, coachId]
      )

      return NextResponse.json(result.rows)
    }

    if (!clientId) {
      return NextResponse.json({ error: 'Missing client_id or workout_id' }, { status: 400 })
    }

    const result = await query(
      'SELECT * FROM workout_results WHERE client_id = $1 ORDER BY created_at DESC',
      [clientId]
    )

    if (!includeDetails) {
      return NextResponse.json(result.rows)
    }

    const details = await Promise.all(
      result.rows.map(async (row: any) => {
        const exerciseResult = await query(
          'SELECT id, workout_id, name, description, result_type FROM exercises WHERE id = $1',
          [row.exercise_id]
        )
        const exercise = exerciseResult.rows[0] || null
        const workoutResult = exercise?.workout_id
          ? await query('SELECT id, name, date, description FROM workouts WHERE id = $1', [exercise.workout_id])
          : { rows: [] }
        const workout = workoutResult.rows[0] || null

        return {
          ...row,
          exercise_name: exercise?.name || null,
          exercise_description: exercise?.description || null,
          result_type: exercise?.result_type || null,
          workout_id: workout?.id || null,
          workout_name: workout?.name || null,
          workout_date: workout?.date || null,
          workout_description: workout?.description || null,
        }
      })
    )

    return NextResponse.json(details)
  } catch (error) {
    console.error('Failed to fetch results:', error)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}
