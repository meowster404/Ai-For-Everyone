import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/security'

export function middleware(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return new NextResponse('Too many requests', { status: 429 })
  }

  const res = NextResponse.next()

  // security headers
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('X-DNS-Prefetch-Control', 'off')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline';"
  )

  return res
}

export const config = {
  matcher: '/api/:path*', // only run for API routes
}
