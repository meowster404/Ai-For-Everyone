'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, CheckCircle2, ExternalLink, Link2, Sheet } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface GoogleSheetConfig {
  name: string
  url: string
  connected: boolean
  connectedAt?: string
}

function normalizeCustomLink(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

export default function FormIntegrationPage() {
  const params = useParams<{ id: string }>()
  const formId = Array.isArray(params.id) ? params.id[0] : params.id

  const [customLink, setCustomLink] = useState('')
  const [origin, setOrigin] = useState('')
  const [sheetName, setSheetName] = useState('')
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!formId) return

    const load = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}`)
        const json = await response.json()
        if (!json.success || !json.data) return

        const formConfig = (json.data.formConfig || json.data.form_config || {}) as {
          customLink?: string
          googleSheet?: GoogleSheetConfig
        }

        setCustomLink(formConfig.customLink || '')
        if (formConfig.googleSheet) {
          setSheetConfig(formConfig.googleSheet)
          setSheetName(formConfig.googleSheet.name || '')
        }
      } catch (error) {
        console.error('Failed to load integration settings:', error)
      }
    }

    load()
  }, [formId])

  const publicPath = useMemo(
    () => normalizeCustomLink(customLink) || formId || '',
    [customLink, formId]
  )
  const formUrl = useMemo(
    () => (origin && publicPath ? `${origin}/submit/${publicPath}` : ''),
    [origin, publicPath]
  )

  const handleCopyFormLink = async () => {
    if (!formUrl) return
    try {
      await navigator.clipboard.writeText(formUrl)
      setStatusMessage('Form link copied')
    } catch {
      setStatusMessage('Could not copy form link')
    }
  }

  const handleCreateAndConnectSheet = async () => {
    if (!formId) return
    const trimmedName = sheetName.trim()
    if (!trimmedName) {
      setStatusMessage('Please enter a sheet name first')
      return
    }

    setIsSaving(true)
    setStatusMessage('')

    try {
      const response = await fetch(`/api/forms/${formId}/sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: trimmedName,
        }),
      })
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to connect Google Sheet')
      }

      const nextSheetConfig = json.data?.googleSheet as GoogleSheetConfig | undefined
      if (nextSheetConfig) {
        setSheetConfig(nextSheetConfig)
      }
      setStatusMessage('Google Sheet created and connected')
    } catch (error) {
      console.error('Google Sheet connection failed:', error)
      setStatusMessage('Could not connect Google Sheet')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 md:px-8 py-4 md:py-6">
        <Link href={`/forms/${formId}/edit`}>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft size={18} />
            <span>Back to Form Editor</span>
          </button>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Integrations</h1>
        <p className="text-sm md:text-base text-muted-foreground">Connect your form to Google Sheets and manage shared links.</p>
      </div>

      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Sheet size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Google Sheets</h2>
                <p className="text-sm text-muted-foreground">
                  Add a sheet name, create it, and connect it to this form.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Sheet Name</label>
              <Input
                value={sheetName}
                onChange={(event) => setSheetName(event.target.value)}
                placeholder="e.g. Event Registrations"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateAndConnectSheet} disabled={isSaving}>
                {isSaving ? 'Connecting...' : 'Create and Connect'}
              </Button>

              {sheetConfig?.connected && (
                <a href={sheetConfig.url} target="_blank" rel="noreferrer" className="inline-flex">
                  <Button variant="outline" className="gap-2">
                    <ExternalLink size={14} />
                    Sheet Link
                  </Button>
                </a>
              )}
            </div>

            {sheetConfig?.connected && (
              <div className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 size={16} className="text-green-600" />
                  Connected
                </div>
                <div className="text-muted-foreground mt-1">
                  Sheet name: <span className="text-foreground">{sheetConfig.name}</span>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 size={16} className="text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Public Form Link</h3>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={formUrl} className="font-mono text-sm" />
              <Button variant="outline" onClick={handleCopyFormLink} disabled={!formUrl}>
                Copy
              </Button>
            </div>
          </Card>

          {statusMessage && (
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}
