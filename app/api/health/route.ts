import { NextResponse } from 'next/server'
import { isAiConfigured } from '@/lib/ai'

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)
  const persistentStoreEnabled = process.env.USE_PERSISTENT_STORE === 'true'

  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        features: {
          aiConfigured: isAiConfigured(),
          databaseConfigured: hasDatabaseUrl,
          persistentLocalStore: persistentStoreEnabled,
        },
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
