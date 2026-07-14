import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminCoachId } from '@/lib/adminAuth'

// GET /api/training-groups - seznam tréninkových skupin přihlášeného trenéra
export async function GET(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await query(
      'SELECT id, name, code, coach_id, created_at FROM training_groups WHERE coach_id = $1 ORDER BY name',
      [coachId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch training groups:', error)
    return NextResponse.json({ error: 'Failed to fetch training groups' }, { status: 500 })
  }
}

// POST /api/training-groups - vytvoření nové tréninkové skupiny
export async function POST(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, code } = await request.json()
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const trimmedCode = typeof code === 'string' ? code.trim() : ''

    if (!trimmedName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const result = await query(
      'INSERT INTO training_groups (name, code, coach_id) VALUES ($1, $2, $3) RETURNING *',
      [trimmedName, trimmedCode || null, coachId]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Tento kód už používá jiná skupina' }, { status: 409 })
    }

    console.error('Failed to create training group:', error)
    return NextResponse.json({ error: 'Failed to create training group' }, { status: 500 })
  }
}
