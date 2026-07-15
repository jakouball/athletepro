import { createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const SUPER_ADMIN_SESSION_COOKIE = 'super_admin_session'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000
export const SUPER_ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000

function getSecret() {
  const secret = process.env.SUPER_ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('SUPER_ADMIN_SESSION_SECRET is not set')
  }
  return secret
}

function sign(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('hex')
}

export function createSuperAdminSessionValue(superAdminId: string) {
  const expiresAt = String(Date.now() + SESSION_DURATION_MS)
  const payload = `${superAdminId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

function parseSessionValue(value: string | undefined | null): { superAdminId: string; expiresAt: number } | null {
  if (!value) return null

  const parts = value.split('.')
  if (parts.length !== 3) return null

  const [superAdminId, expiresAtRaw, signature] = parts
  if (!superAdminId || !expiresAtRaw || !signature) return null

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null

  const payload = `${superAdminId}.${expiresAtRaw}`
  const expected = Buffer.from(sign(payload))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length) return null
  if (!timingSafeEqual(expected, actual)) return null

  return { superAdminId, expiresAt }
}

// Vrátí id přihlášeného super admina ze session cookie, nebo null.
export function getSuperAdminId(request: NextRequest): string | null {
  return parseSessionValue(request.cookies.get(SUPER_ADMIN_SESSION_COOKIE)?.value)?.superAdminId || null
}
