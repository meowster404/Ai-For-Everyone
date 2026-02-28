'use client'

import { useState, type FormEvent } from 'react'
import { Copy, Mail } from 'lucide-react'

import { StudioShell } from '@/components/studio-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type InvitationResponse = {
  subject: string
  body: string
}

const inputClassName =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

function getTodayAsISO() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default function InvitationEmailsPage() {
  const [form, setForm] = useState({
    eventName: '',
    hostName: '',
    eventDate: getTodayAsISO(),
    location: '',
    audience: 'guests',
    rsvpLink: '',
    tone: 'friendly',
  })
  const [result, setResult] = useState<InvitationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/generate-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Invitation generation failed')
      }
      setResult(json.data as InvitationResponse)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Invitation generation failed')
    } finally {
      setLoading(false)
    }
  }

  const copyAll = async () => {
    if (!result || typeof navigator === 'undefined') return
    await navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`)
  }

  return (
    <StudioShell
      title="Invitation Emails"
      description="Generate ready-to-send invitation email subject and body for your event."
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
              <Mail className="size-5" />
              Invitation Email Generator
            </CardTitle>
            <CardDescription>Create invitation copy with event details and tone.</CardDescription>
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
                  <span className="text-muted-foreground">Host Name</span>
                  <input
                    className={inputClassName}
                    value={form.hostName}
                    onChange={(event) => setForm((prev) => ({ ...prev, hostName: event.target.value }))}
                  />
                </label>
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
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Location</span>
                <input
                  className={inputClassName}
                  value={form.location}
                  onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Audience</span>
                  <input
                    className={inputClassName}
                    value={form.audience}
                    onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Tone</span>
                  <select
                    className={inputClassName}
                    value={form.tone}
                    onChange={(event) => setForm((prev) => ({ ...prev, tone: event.target.value }))}
                  >
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                    <option value="excited">Excited</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">RSVP Link / Instruction</span>
                <input
                  className={inputClassName}
                  value={form.rsvpLink}
                  onChange={(event) => setForm((prev) => ({ ...prev, rsvpLink: event.target.value }))}
                  placeholder="https://example.com/rsvp"
                />
              </label>

              <Button className="w-full" disabled={loading} type="submit">
                {loading ? 'Generating invitation...' : 'Generate Invitation Email'}
              </Button>
            </form>

            <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Generated Email</p>
                <Button onClick={copyAll} size="sm" variant="outline" disabled={!result}>
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
              {result ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Subject: {result.subject}</p>
                  <pre className="whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm">{result.body}</pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your invitation draft will appear here after generation.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  )
}
