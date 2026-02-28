import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Under Maintenance',
  description: 'The site is currently under maintenance. Please try again later.',
}

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen bg-background flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-yellow-100/20 p-4 dark:bg-yellow-900/20">
            <AlertCircle size={48} className="text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Under Maintenance</h1>
          <p className="text-lg text-muted-foreground">We'll be back soon</p>
        </div>

        <p className="text-muted-foreground max-w-md mx-auto">
          We're currently performing scheduled maintenance to improve your experience. We'll be back online shortly.
        </p>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Expected downtime: 1-2 hours</p>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
