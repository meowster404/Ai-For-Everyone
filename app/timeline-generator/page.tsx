'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { CalendarRange } from 'lucide-react'

import { StudioShell } from '@/components/studio-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type TimelineItem = {
  week: number
  title: string
  date: string
  summary: string
}

const inputClassName =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

function getTodayAsISO() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default function TimelineGeneratorPage() {
  const [form, setForm] = useState({
    eventName: '',
    startDate: getTodayAsISO(),
    durationWeeks: '8',
    milestones: '',
  })
  const [timelineResult, setTimelineResult] = useState<TimelineItem[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const timelineSummary = useMemo(() => {
    if (!timelineResult.length) return ''
    return `${timelineResult.length} milestones generated`
  }, [timelineResult])

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setTimelineLoading(true)

    try {
      const response = await fetch('/api/generate-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: form.eventName,
          startDate: form.startDate,
          milestones: form.milestones,
          durationWeeks: Number(form.durationWeeks),
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Timeline generation failed')
      }
      setTimelineResult(json.data?.items ?? [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Timeline generation failed')
    } finally {
      setTimelineLoading(false)
    }
  }

  return (
    <StudioShell
      description="Build a full event timeline with week-by-week milestones."
      title="Event Timeline"
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
              <CalendarRange className="size-5" />
              Event Timeline Generator
            </CardTitle>
            <CardDescription>Convert event plans into milestone timelines with dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={handleGenerate}>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Event Name</span>
                <input
                  className={inputClassName}
                  placeholder="Example: Annual Community Meetup"
                  value={form.eventName}
                  onChange={(event) => setForm((prev) => ({ ...prev, eventName: event.target.value }))}
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Start Date</span>
                  <input
                    className={inputClassName}
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Duration (weeks)</span>
                  <input
                    className={inputClassName}
                    type="number"
                    min={2}
                    max={52}
                    value={form.durationWeeks}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, durationWeeks: event.target.value }))
                    }
                    required
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Milestones (one per line)</span>
                <textarea
                  className={inputClassName}
                  rows={5}
                  placeholder={'Venue booking\nSpeaker confirmations\nPromotion push\nOn-site setup'}
                  value={form.milestones}
                  onChange={(event) => setForm((prev) => ({ ...prev, milestones: event.target.value }))}
                />
              </label>

              <Button className="w-full" disabled={timelineLoading} type="submit">
                <CalendarRange className="size-4" />
                {timelineLoading ? 'Building timeline...' : 'Generate Event Timeline'}
              </Button>
            </form>

            {timelineResult.length ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium">{timelineSummary}</p>
                <div className="space-y-2">
                  {timelineResult.map((item) => (
                    <div className="rounded-md border border-border bg-background p-3" key={`${item.week}-${item.title}`}>
                      <p className="text-xs text-muted-foreground">
                        Week {item.week} - {item.date}
                      </p>
                      <p className="mt-1 text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">
                  Your event timeline will appear here after generation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  )
}
