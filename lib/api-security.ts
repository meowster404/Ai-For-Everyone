import { NextResponse } from 'next/server'

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RequestGuardOptions = {
  routeKey: string
  maxBodyBytes: number
  maxRequests: number
  windowMs: number
}

const DEFAULT_GUARD_OPTIONS = {
  maxRequests: 30,
  windowMs: 60_000,
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
} as const

function setSecurityHeaders(response: NextResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    response.headers.set(name, value)
  })
  return response
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return request.headers.get('x-real-ip')?.trim() ?? 'unknown'
}

function cleanupRateLimitStore(now: number) {
  if (rateLimitStore.size < 1_000) return
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}

function enforceRateLimit(request: Request, routeKey: string, maxRequests: number, windowMs: number) {
  const now = Date.now()
  cleanupRateLimitStore(now)

  const rateKey = `${routeKey}:${getClientIp(request)}`
  const current = rateLimitStore.get(rateKey)

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(rateKey, {
      count: 1,
      resetAt: now + windowMs,
    })
    return null
  }

  if (current.count >= maxRequests) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000)
    const response = jsonError('Too many requests. Please retry shortly.', 429)
    response.headers.set('Retry-After', String(Math.max(retryAfter, 1)))
    return response
  }

  current.count += 1
  rateLimitStore.set(rateKey, current)
  return null
}

function enforceOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return null

  try {
    const requestOrigin = new URL(request.url).origin
    if (new URL(origin).origin !== requestOrigin) {
      return jsonError('Cross-site requests are not allowed.', 403)
    }
    return null
  } catch {
    return jsonError('Invalid request origin.', 403)
  }
}

function enforceJsonContentType(request: Request) {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/json')) {
    return jsonError('Content-Type must be application/json.', 415)
  }
  return null
}

function enforceBodySize(request: Request, maxBodyBytes: number) {
  const contentLengthRaw = request.headers.get('content-length')
  if (!contentLengthRaw) return null

  const contentLength = Number(contentLengthRaw)
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return jsonError(`Request body exceeds ${maxBodyBytes} bytes.`, 413)
  }
  return null
}

export function applyRequestGuards(request: Request, options: RequestGuardOptions) {
  const resolvedOptions = {
    ...DEFAULT_GUARD_OPTIONS,
    ...options,
  }

  return (
    enforceOrigin(request) ||
    enforceJsonContentType(request) ||
    enforceBodySize(request, resolvedOptions.maxBodyBytes) ||
    enforceRateLimit(
      request,
      resolvedOptions.routeKey,
      resolvedOptions.maxRequests,
      resolvedOptions.windowMs
    )
  )
}

export async function parseJsonBody<T>(request: Request) {
  try {
    const data = (await request.json()) as T
    return { ok: true as const, data }
  } catch {
    return {
      ok: false as const,
      response: jsonError('Invalid JSON payload.', 400),
    }
  }
}

export function sanitizeSingleLine(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.slice(0, maxLength)
}

export function sanitizeLineList(value: unknown, maxLines: number, maxLineLength: number) {
  if (typeof value !== 'string') return []
  return value
    .split(/\r?\n/)
    .map((line) => sanitizeSingleLine(line, maxLineLength))
    .filter(Boolean)
    .slice(0, maxLines)
}

export function parseISODateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null
  if (parsed.toISOString().slice(0, 10) !== value) return null
  return parsed
}

export function jsonSuccess<T>(data: T, status = 200) {
  return setSecurityHeaders(NextResponse.json({ success: true, data }, { status }))
}

export function jsonError(message: string, status: number) {
  return setSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }))
}
