import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashPassword } from '@/lib/adminAuth'
import { getSuperAdminId } from '@/lib/superAdminAuth'

const VALID_COACH_TYPES = ['fitness', 'football']

// GET /api/super-admin/coaches - seznam všech trenérů na platformě
export async function GET(request: NextRequest) {
  try {
    if (!getSuperAdminId(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await query(
      `SELECT c.id, c.email, c.name, c.slug, c.coach_type, c.created_at,
        (SELECT COUNT(*)::int FROM clients WHERE coach_id = c.id) as client_count
       FROM coaches c
       ORDER BY c.created_at DESC`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch coaches:', error)
    return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 })
  }
}

// POST /api/super-admin/coaches - vytvoření nového trenéra
export async function POST(request: NextRequest) {
  try {
    if (!getSuperAdminId(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, password, slug, coach_type } = await request.json()
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const trimmedEmail = typeof email === 'string' ? email.trim() : ''
    const trimmedSlug = typeof slug === 'string' ? slug.trim() : ''

    if (!trimmedName || !trimmedEmail || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }

    if (coach_type && !VALID_COACH_TYPES.includes(coach_type)) {
      return NextResponse.json({ error: 'Invalid coach_type' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO coaches (name, email, password_hash, slug, coach_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, slug, coach_type, created_at`,
      [trimmedName, trimmedEmail, hashPassword(password), trimmedSlug || null, coach_type || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Email nebo slug už používá jiný trenér' }, { status: 409 })
    }

    console.error('Failed to create coach:', error)
    return NextResponse.json({ error: 'Failed to create coach' }, { status: 500 })
  }
}

// PUT /api/super-admin/coaches - úprava trenéra (a volitelně reset hesla)
export async function PUT(request: NextRequest) {
  try {
    if (!getSuperAdminId(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, name, email, password, slug, coach_type } = await request.json()
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const trimmedEmail = typeof email === 'string' ? email.trim() : ''
    const trimmedSlug = typeof slug === 'string' ? slug.trim() : ''

    if (!id || !trimmedName || !trimmedEmail) {
      return NextResponse.json({ error: 'id, name and email are required' }, { status: 400 })
    }

    if (coach_type && !VALID_COACH_TYPES.includes(coach_type)) {
      return NextResponse.json({ error: 'Invalid coach_type' }, { status: 400 })
    }

    const result = password
      ? await query(
          `UPDATE coaches SET name = $1, email = $2, slug = $3, coach_type = $4, password_hash = $5
           WHERE id = $6
           RETURNING id, email, name, slug, coach_type, created_at`,
          [trimmedName, trimmedEmail, trimmedSlug || null, coach_type || null, hashPassword(password), id]
        )
      : await query(
          `UPDATE coaches SET name = $1, email = $2, slug = $3, coach_type = $4
           WHERE id = $5
           RETURNING id, email, name, slug, coach_type, created_at`,
          [trimmedName, trimmedEmail, trimmedSlug || null, coach_type || null, id]
        )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Email nebo slug už používá jiný trenér' }, { status: 409 })
    }

    console.error('Failed to update coach:', error)
    return NextResponse.json({ error: 'Failed to update coach' }, { status: 500 })
  }
}

// DELETE /api/super-admin/coaches - smazání trenéra (kaskádově smaže i jeho klienty/tréninky)
export async function DELETE(request: NextRequest) {
  try {
    if (!getSuperAdminId(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const result = await query('DELETE FROM coaches WHERE id = $1 RETURNING *', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete coach:', error)
    return NextResponse.json({ error: 'Failed to delete coach' }, { status: 500 })
  }
}
