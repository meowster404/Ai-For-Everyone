'use client'

import { useState, type FormEvent } from 'react'
import { CalendarClock, Copy } from 'lucide-react'

import { StudioShell } from '@/components/studio-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ReminderItem = {
  stage: string
  timing: string
  date: string
  message: string
  channels: string[]
}

type ReminderResponse = {
  eventName: string
  eventDate: string
  items: ReminderItem[]
}

const inputClassName =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

function getTodayAsISO() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default function ReminderSchedulePage() {
  const [form, setForm] = useState({
    eventName: '',
    eventDate: getTodayAsISO(),
    channels: 'email, whatsapp',
  })
  const [result, setResult] = useState<ReminderResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/generate-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Reminder generation failed')
      }
      setResult(json.data as ReminderResponse)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Reminder generation failed')
    } finally {
      setLoading(false)
    }
  }

  const copySchedule = async () => {
    if (!result || typeof navigator === 'undefined') return
    const lines = result.items.map(
      (item) => `${item.date} (${item.timing}) - ${item.stage} [${item.channels.join(', ')}]`
    )
    await navigator.clipboard.writeText(`${result.eventName} Reminder Schedule\n\n${lines.join('\n')}`)
  }

  return (
    <StudioShell
      title="Reminder Schedule"
      description="Generate a full reminder sequence before, during, and after your event."
    >
      {errorMessage ? (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5" />
              Reminder Schedule Generator
            </CardTitle>
            <CardDescription>Build communication reminders for key event milestones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={handleGenerate}>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Event Name</span>
                <input
                  className={inputClassName}
                  value={form.eventName}
                  onChange={(event) => setForm((prev) => ({ ...prev, eventName: event.target.value }))}
                  required
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Event Date</span>
                  <input
                    className={inputClassName}
                    type="date"
                    value={form.eventDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, eventDate: event.target.value }))}
                    required
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Channels (comma separated)</span>
                  <input
                    className={inputClassName}
                    value={form.channels}
                    onChange={(event) => setForm((prev) => ({ ...prev, channels: event.target.value }))}
                    placeholder="email, whatsapp, sms"
                  />
                </label>
              </div>
              <Button className="w-full" disabled={loading} type="submit">
                {loading ? 'Generating reminders...' : 'Generate Reminder Schedule'}
              </Button>
            </form>

            <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Reminder Plan</p>
                <Button onClick={copySchedule} size="sm" variant="outline" disabled={!result}>
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
              {result ? (
                <div className="space-y-2">
                  {result.items.map((item, index) => (
                    <div className="rounded-md border border-border bg-background p-3" key={`${item.stage}-${index}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.stage}</p>
                        <span className="text-xs text-muted-foreground">{item.timing}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.date}</p>
                      <p className="text-sm mt-1">{item.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Channels: {item.channels.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your reminder schedule will appear here after generation.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  )
}
