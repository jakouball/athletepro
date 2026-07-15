import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyPassword } from '@/lib/adminAuth'
import {
  SUPER_ADMIN_SESSION_COOKIE,
  SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
  createSuperAdminSessionValue,
} from '@/lib/superAdminAuth'
import { checkRateLimit, getRequestIp } from '@/lib/rateLimit'

const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(`super-admin-login:${getRequestIp(request)}`, MAX_ATTEMPTS, WINDOW_MS)) {
      return NextResponse.json({ error: 'Příliš mnoho pokusů, zkus to prosím později' }, { status: 429 })
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Nesprávný email nebo heslo' }, { status: 401 })
    }

    const result = await query('SELECT id, password_hash FROM super_admins WHERE email = $1', [email])
    const superAdmin = result.rows[0]

    if (!superAdmin || !verifyPassword(password, superAdmin.password_hash)) {
      return NextResponse.json({ error: 'Nesprávný email nebo heslo' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(SUPER_ADMIN_SESSION_COOKIE, createSuperAdminSessionValue(superAdmin.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
    })

    return response
  } catch (error) {
    console.error('Failed to login super admin:', error)
    return NextResponse.json({ error: 'Přihlášení selhalo' }, { status: 500 })
  }
}
