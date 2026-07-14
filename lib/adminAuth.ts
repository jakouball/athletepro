import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const ADMIN_SESSION_COOKIE = 'admin_session'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set')
  }
  return secret
}

function sign(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('hex')
}

export function createAdminSessionValue(coachId: string) {
  const expiresAt = String(Date.now() + SESSION_DURATION_MS)
  const payload = `${coachId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

function parseSessionValue(value: string | undefined | null): { coachId: string; expiresAt: number } | null {
  if (!value) return null

  const parts = value.split('.')
  if (parts.length !== 3) return null

  const [coachId, expiresAtRaw, signature] = parts
  if (!coachId || !expiresAtRaw || !signature) return null

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null

  const payload = `${coachId}.${expiresAtRaw}`
  const expected = Buffer.from(sign(payload))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length) return null
  if (!timingSafeEqual(expected, actual)) return null

  return { coachId, expiresAt }
}

export function isValidAdminSessionValue(value: string | undefined | null): boolean {
  return parseSessionValue(value) !== null
}

// Vrátí coach_id přihlášeného trenéra z podepsané session cookie, nebo null.
export function getAdminCoachId(request: NextRequest): string | null {
  return parseSessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)?.coachId || null
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false

  const hashBuffer = Buffer.from(hash, 'hex')
  const candidateBuffer = scryptSync(password, salt, 64)
  if (hashBuffer.length !== candidateBuffer.length) return false

  return timingSafeEqual(hashBuffer, candidateBuffer)
}
