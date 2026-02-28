import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen bg-background flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <p className="text-xl font-semibold text-muted-foreground">Page Not Found</p>
        </div>
        
        <p className="text-muted-foreground max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
