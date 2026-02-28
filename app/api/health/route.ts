import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
