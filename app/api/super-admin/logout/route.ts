import { NextResponse } from 'next/server'
import { SUPER_ADMIN_SESSION_COOKIE } from '@/lib/superAdminAuth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(SUPER_ADMIN_SESSION_COOKIE)
  return response
}
