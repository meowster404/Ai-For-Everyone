'use client'

import { useState, type FormEvent } from 'react'
import { Copy, UserCheck } from 'lucide-react'

import { StudioShell } from '@/components/studio-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Assignment = {
  task: string
  volunteer: string
  backupVolunteer: string
}

type AssignmentResponse = {
  eventName: string
  totalTasks: number
  assignments: Assignment[]
}

const inputClassName =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function VolunteerAssignmentsPage() {
  const [form, setForm] = useState({
    eventName: '',
    volunteers: '',
    tasks: '',
  })
  const [result, setResult] = useState<AssignmentResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/assign-volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Assignment generation failed')
      }
      setResult(json.data as AssignmentResponse)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Assignment generation failed')
    } finally {
      setLoading(false)
    }
  }

  const copyPlan = async () => {
    if (!result || typeof navigator === 'undefined') return
    const lines = result.assignments.map(
      (item, index) => `${index + 1}. ${item.task}: ${item.volunteer} (backup: ${item.backupVolunteer})`
    )
    await navigator.clipboard.writeText(`${result.eventName} - Volunteer Task Assignments\n\n${lines.join('\n')}`)
  }

  return (
    <StudioShell
      title="Volunteer Task Assignments"
      description="Distribute event tasks among volunteers with backup owners."
    >
      {errorMessage ? (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-5" />
              Volunteer Assignment Planner
            </CardTitle>
            <CardDescription>Add volunteers and tasks (one per line) to generate assignments.</CardDescription>
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
                  <span className="text-muted-foreground">Volunteers (one per line)</span>
                  <textarea
                    className={inputClassName}
                    rows={8}
                    placeholder={'Aarav\nSara\nMaya\nNoah'}
                    value={form.volunteers}
                    onChange={(event) => setForm((prev) => ({ ...prev, volunteers: event.target.value }))}
                    required
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Tasks (one per line)</span>
                  <textarea
                    className={inputClassName}
                    rows={8}
                    placeholder={'Registration desk\nStage support\nGuest help desk\nPhoto & video'}
                    value={form.tasks}
                    onChange={(event) => setForm((prev) => ({ ...prev, tasks: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <Button className="w-full" disabled={loading} type="submit">
                {loading ? 'Assigning tasks...' : 'Generate Task Assignments'}
              </Button>
            </form>

            <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Assignment Output</p>
                <Button onClick={copyPlan} size="sm" variant="outline" disabled={!result}>
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
              {result ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total tasks: {result.totalTasks}</p>
                  <div className="space-y-2">
                    {result.assignments.map((item, index) => (
                      <div className="rounded-md border border-border bg-background p-3" key={`${item.task}-${index}`}>
                        <p className="text-sm font-medium">{item.task}</p>
                        <p className="text-sm text-muted-foreground">Owner: {item.volunteer}</p>
                        <p className="text-xs text-muted-foreground">Backup: {item.backupVolunteer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Task assignments will appear here after generation.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  )
}
