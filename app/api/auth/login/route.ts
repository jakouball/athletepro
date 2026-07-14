import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { randomUUID } from 'crypto'
import { checkRateLimit, getRequestIp } from '@/lib/rateLimit'

const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(`client-login:${getRequestIp(request)}`, MAX_ATTEMPTS, WINDOW_MS)) {
      return NextResponse.json({ error: 'Příliš mnoho pokusů, zkus to prosím později' }, { status: 429 })
    }

    const { clientId, code } = await request.json()

    if (!clientId || !code) {
      return NextResponse.json({ error: 'clientId and code are required' }, { status: 400 })
    }

    const result = await query(
      'SELECT id FROM clients WHERE id = $1 AND code = $2',
      [clientId, code]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    }

    const token = randomUUID()
    await query(
      'UPDATE clients SET session_token = $1, token_created_at = NOW() WHERE id = $2',
      [token, clientId]
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Failed to create login token:', error)
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 })
  }
}
