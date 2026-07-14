import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminCoachId } from '@/lib/adminAuth'

const WORKOUT_TYPES = ['group', 'individual']

async function autoCheckinIndividualClient(workoutId: string, clientId: string) {
  await query(
    `INSERT INTO workout_checkins (workout_id, client_id)
     VALUES ($1, $2)
     ON CONFLICT (workout_id, client_id) DO NOTHING`,
    [workoutId, clientId]
  )
}

// GET /api/workouts - seznam tréninků
//
// Řazení podle kontextu (stejné jako u /api/clients):
// - admin session  -> tréninky přihlášeného trenéra
// - ?coach=<slug>  -> veřejné tréninky daného trenéra (klientská appka)
// - jinak          -> všechny tréninky (zpětná kompatibilita)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const date = searchParams.get('date')
    const coachSlug = searchParams.get('coach')
    const includeExercises = searchParams.get('include_exercises') === 'true' || searchParams.get('include_exercises') === '1'
    const adminCoachId = getAdminCoachId(request)

    let sql = `SELECT w.*, c.name as assigned_client_name, tg.name as training_group_name, tg.code as training_group_code
                FROM workouts w
                LEFT JOIN clients c ON c.id = w.client_id
                LEFT JOIN training_groups tg ON tg.id = w.training_group_id`
    const conditions: string[] = []
    const params: any[] = []

    if (id) {
      params.push(id)
      conditions.push(`w.id = $${params.length}`)
    }

    if (date) {
      params.push(date)
      conditions.push(`w.date = $${params.length}`)
    }

    if (adminCoachId) {
      params.push(adminCoachId)
      conditions.push(`w.coach_id = $${params.length}`)
    } else if (coachSlug) {
      params.push(coachSlug)
      conditions.push(`w.coach_id = (SELECT id FROM coaches WHERE slug = $${params.length})`)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    sql += ' ORDER BY w.date DESC, w.created_at ASC'

    const result = await query(sql, params)
    const workouts = result.rows

    if (!includeExercises) {
      return NextResponse.json(workouts)
    }

    const workoutsWithExercises = await Promise.all(
      workouts.map(async (workout: { id: string; [key: string]: any }) => {
        const exercisesResult = await query(
          'SELECT id, workout_id, name, description, result_type, "order", created_at FROM exercises WHERE workout_id = $1 ORDER BY "order", created_at',
          [workout.id]
        )

        return {
          ...workout,
          exercises: exercisesResult.rows,
        }
      })
    )

    return NextResponse.json(workoutsWithExercises)
  } catch (error) {
    console.error('Failed to fetch workouts:', error)
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
  }
}

// POST /api/workouts - vytvoření nového tréninku
export async function POST(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, date, exercises, workout_type, training_group_id, client_id } = await request.json()
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const trimmedDescription = typeof description === 'string' ? description.trim() : ''
    const workoutType = WORKOUT_TYPES.includes(workout_type) ? workout_type : 'group'

    if (!trimmedName || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      )
    }

    if (workoutType === 'individual' && !client_id) {
      return NextResponse.json(
        { error: 'client_id is required for individual workouts' },
        { status: 400 }
      )
    }

    if (workoutType === 'group' && !training_group_id) {
      return NextResponse.json(
        { error: 'training_group_id is required for group workouts' },
        { status: 400 }
      )
    }

    const assignedClientId = workoutType === 'individual' ? client_id : null
    const assignedGroupId = workoutType === 'group' ? training_group_id : null

    const workoutResult = await query(
      'INSERT INTO workouts (name, description, date, coach_id, workout_type, training_group_id, client_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [trimmedName, trimmedDescription || null, date, coachId, workoutType, assignedGroupId, assignedClientId]
    )

    const workoutId = workoutResult.rows[0].id

    if (exercises && exercises.length > 0) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        await query(
          'INSERT INTO exercises (workout_id, name, description, result_type, "order") VALUES ($1, $2, $3, $4, $5)',
          [workoutId, ex.name, ex.description || null, ex.result_type, i]
        )
      }
    }

    if (assignedClientId) {
      await autoCheckinIndividualClient(workoutId, assignedClientId)
    }

    return NextResponse.json(workoutResult.rows[0], { status: 201 })
  } catch (error) {
    console.error('Failed to create workout:', error)
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
  }
}

// PUT /api/workouts - úprava existujícího tréninku
export async function PUT(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, name, description, date, exercises, workout_type, training_group_id, client_id } = await request.json()
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const trimmedDescription = typeof description === 'string' ? description.trim() : ''
    const workoutType = WORKOUT_TYPES.includes(workout_type) ? workout_type : 'group'

    if (!id || !trimmedName || !date) {
      return NextResponse.json(
        { error: 'id, name and date are required' },
        { status: 400 }
      )
    }

    if (workoutType === 'individual' && !client_id) {
      return NextResponse.json(
        { error: 'client_id is required for individual workouts' },
        { status: 400 }
      )
    }

    if (workoutType === 'group' && !training_group_id) {
      return NextResponse.json(
        { error: 'training_group_id is required for group workouts' },
        { status: 400 }
      )
    }

    const assignedClientId = workoutType === 'individual' ? client_id : null
    const assignedGroupId = workoutType === 'group' ? training_group_id : null

    const workoutResult = await query(
      'UPDATE workouts SET name = $1, description = $2, date = $3, workout_type = $4, training_group_id = $5, client_id = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 AND coach_id = $8 RETURNING *',
      [trimmedName, trimmedDescription || null, date, workoutType, assignedGroupId, assignedClientId, id, coachId]
    )

    if (workoutResult.rowCount === 0) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (assignedClientId) {
      await autoCheckinIndividualClient(id, assignedClientId)
    }

    await query('DELETE FROM exercises WHERE workout_id = $1', [id])

    if (exercises && exercises.length > 0) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        await query(
          'INSERT INTO exercises (workout_id, name, description, result_type, "order") VALUES ($1, $2, $3, $4, $5)',
          [id, ex.name, ex.description || null, ex.result_type, i]
        )
      }
    }

    return NextResponse.json(workoutResult.rows[0])
  } catch (error) {
    console.error('Failed to update workout:', error)
    return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
  }
}

// DELETE /api/workouts - smazání existujícího tréninku
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

    const workoutResult = await query('DELETE FROM workouts WHERE id = $1 AND coach_id = $2 RETURNING *', [id, coachId])

    if (workoutResult.rowCount === 0) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete workout:', error)
    return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 })
  }
}
