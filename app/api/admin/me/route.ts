import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminCoachId } from '@/lib/adminAuth'

// GET /api/admin/me - údaje o přihlášeném trenérovi
export async function GET(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await query('SELECT id, email, name, slug FROM coaches WHERE id = $1', [coachId])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Failed to fetch coach:', error)
    return NextResponse.json({ error: 'Failed to fetch coach' }, { status: 500 })
  }
}
