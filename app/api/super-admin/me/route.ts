import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSuperAdminId } from '@/lib/superAdminAuth'

// GET /api/super-admin/me - údaje o přihlášeném super adminovi
export async function GET(request: NextRequest) {
  try {
    const superAdminId = getSuperAdminId(request)
    if (!superAdminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await query('SELECT id, email FROM super_admins WHERE id = $1', [superAdminId])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Super admin not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Failed to fetch super admin:', error)
    return NextResponse.json({ error: 'Failed to fetch super admin' }, { status: 500 })
  }
}
