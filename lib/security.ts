// basic security utilities for API routes

// simple sanitizer to escape angle brackets and other dangerous characters
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  if (input && typeof input === 'object') {
    const out: any = {}
    for (const key in input) {
      out[key] = sanitizeInput(input[key])
    }
    return out
  }
  return input
}

interface RateEntry {
  count: number
  reset: number
}

const rateMap = new Map<string, RateEntry>()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 60

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const key = ip || 'unknown'

  // Opportunistic cleanup to avoid unbounded growth.
  for (const [entryKey, value] of rateMap.entries()) {
    if (now > value.reset) {
      rateMap.delete(entryKey)
    }
  }

  const entry = rateMap.get(key) || { count: 0, reset: now + WINDOW_MS }
  if (now > entry.reset) {
    entry.count = 0
    entry.reset = now + WINDOW_MS
  }
  entry.count += 1
  rateMap.set(key, entry)
  return entry.count <= MAX_REQUESTS
}

function normalizeIp(ip: string): string {
  let normalized = ip.trim()
  if (!normalized) return 'unknown'

  if (normalized.startsWith('[') && normalized.includes(']')) {
    normalized = normalized.slice(1, normalized.indexOf(']'))
  } else if (normalized.includes('.') && normalized.includes(':')) {
    const segments = normalized.split(':')
    const maybePort = segments[segments.length - 1]
    if (/^\d+$/.test(maybePort)) {
      normalized = segments.slice(0, -1).join(':')
    }
  }

  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice(7)
  }
  if (normalized === '::1') {
    return '127.0.0.1'
  }

  return normalized || 'unknown'
}

export function getClientIp(req: any): string {
  // NextRequest may not expose ip directly, so prefer proxy headers.
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(',')[0] || '')
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return normalizeIp(realIp)
  }

  return normalizeIp(req.ip || 'unknown')
}

export function hasJsonContentType(req: any): boolean {
  const contentType = req.headers.get('content-type') || ''
  return contentType.toLowerCase().includes('application/json')
}

export function isTrustedOrigin(req: any): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true

  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = (forwardedHost || req.headers.get('host') || '').split(',')[0].trim()
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const protocol = (forwardedProto || 'http').split(',')[0].trim().replace(':', '')

  if (!host) return false

  try {
    const originUrl = new URL(origin)
    const originProto = originUrl.protocol.replace(':', '')
    return originUrl.host === host && originProto === protocol
  } catch {
    return false
  }
}
