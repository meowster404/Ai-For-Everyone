'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarClock,
  CalendarRange,
  Home,
  Mail,
  Sparkles,
  UserCheck,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type StudioShellProps = {
  title: string
  description: string
  children: React.ReactNode
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/invitation-emails', label: 'Invitation Emails', icon: Mail },
  { href: '/post-generator', label: 'Post Generator', icon: Sparkles },
  { href: '/timeline-generator', label: 'Event Timeline', icon: CalendarRange },
  { href: '/volunteer-assignments', label: 'Volunteer Tasks', icon: UserCheck },
  { href: '/reminder-schedule', label: 'Reminder Schedule', icon: CalendarClock },
]

function navClassName(isActive: boolean) {
  return cn(
    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors',
    isActive
      ? 'bg-primary/10 font-medium text-primary'
      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
  )
}

export function StudioShell({ title, description, children }: StudioShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-72 border-r border-border bg-card p-6 md:flex md:flex-col">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">AI Content Studio</h1>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link className={navClassName(isActive)} href={item.href} key={item.href}>
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <main className="flex-1">
        <header className="border-b border-border bg-card px-4 py-6 md:px-8">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <nav className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link className={navClassName(isActive)} href={item.href} key={item.href}>
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <section className="p-4 md:p-8">{children}</section>
      </main>
    </div>
  )
}
