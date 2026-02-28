'use client'

import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Wifi } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen bg-background flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100/20 p-4 dark:bg-red-900/20">
            <Wifi size={48} className="text-red-600 dark:text-red-400 line-through" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">You're Offline</h1>
          <p className="text-lg text-muted-foreground">No internet connection detected</p>
        </div>

        <p className="text-muted-foreground max-w-md mx-auto">
          It looks like you've lost your internet connection. Please check your network and try again.
        </p>

        <div className="space-y-4">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>✓ Check your Wi-Fi connection</li>
            <li>✓ Restart your router</li>
            <li>✓ Try a different network</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="inline-block"
          >
            <Button>Retry</Button>
          </button>
        </div>
      </div>
    </div>
  )
}
