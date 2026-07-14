import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { clientId, token } = await request.json()

    if (!clientId || !token) {
      return NextResponse.json({ error: 'clientId and token are required' }, { status: 400 })
    }

    const result = await query(
      'SELECT id FROM clients WHERE id = $1 AND session_token = $2',
      [clientId, token]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Failed to verify token:', error)
    return NextResponse.json({ error: 'Failed to verify token' }, { status: 500 })
  }
}
