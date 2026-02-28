import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Rocket } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Coming Soon',
  description: 'Exciting things are coming soon. Stay tuned!',
}

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-screen bg-background flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Rocket size={48} className="text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Coming Soon</h1>
          <p className="text-lg text-muted-foreground">Something amazing is brewing</p>
        </div>

        <p className="text-muted-foreground max-w-md mx-auto">
          We're working hard to bring you new features and improvements. Be the first to know when we launch!
        </p>

        <div className="space-y-4">
          <form className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground"
              required
            />
            <Button type="submit">Notify Me</Button>
          </form>
          <Link href="/">
            <Button variant="outline" className="w-full">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
