'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  BarChart3,
  CalendarClock,
  CalendarRange,
  Database,
  Edit2,
  Eye,
  FileText,
  Home,
  Mail,
  Plus,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import { AIWorkflowChat } from '@/components/ai-workflow-chat'
import { FormCreationModal } from '@/components/form-creation-modal'
import { useRouter } from 'next/navigation'

type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'date'
  | 'time'
  | 'phone'
  | 'link'
  | 'upload'
  | 'rating'
  | 'payment'
  | 'signature'
  | 'linear-scale'
  | 'matrix'
  | 'ranking'

type FormField = {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[]
}

interface Form {
  id: string
  name: string
  description: string
  submissionCount: number
  createdAt: string
  eventId: string
}

interface FormDraft {
  id?: string
  name: string
  description: string
  eventId?: string
  fields?: FormField[]
  formConfig?: Record<string, unknown>
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default function DashboardPage() {
  const router = useRouter()
  const [forms, setForms] = useState<Form[]>([])
  const [showCreationModal, setShowCreationModal] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadForms = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/forms')
        const json = await res.json()
        if (!json.success || !Array.isArray(json.data)) return

        const mapped: Form[] = json.data.map((row: any) => ({
          id: row.id,
          name: row.name || 'Untitled Form',
          description: row.description || '',
          submissionCount: row.submissionCount ?? row.submission_count ?? 0,
          createdAt: row.createdAt || row.created_at || new Date().toISOString(),
          eventId: row.eventId || row.event_id || '',
          fields: Array.isArray(row.fields) ? row.fields : [],
          formConfig: row.formConfig || row.form_config || {},
        }))
        setForms(mapped)
      } catch (error) {
        console.error('Failed to load forms:', error)
      } finally {
        setLoading(false)
      }
    }

    loadForms()
  }, [])

  const handleDeleteForm = async (id: string) => {
    try {
      await fetch(`/api/forms/${id}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to delete form:', error)
    }
    setForms((prev) => prev.filter((form: Form) => form.id !== id))
  }

  const createFormAndOpenEditor = async (draft: FormDraft) => {
    const fallbackName = draft.name || 'Untitled Form'
    const fallbackDescription = draft.description || ''
    const fallbackFields = Array.isArray(draft.fields) ? draft.fields : []
    const fallbackFormConfig =
      draft.formConfig && typeof draft.formConfig === 'object' ? draft.formConfig : {}

    const payload: {
      id?: string
      name: string
      description: string
      eventId: string | null
      fields: FormField[]
      formConfig: Record<string, unknown>
    } = {
      name: fallbackName,
      description: fallbackDescription,
      eventId: draft.eventId || null,
      fields: fallbackFields,
      formConfig: fallbackFormConfig,
    }
    if (draft.id && isUuid(draft.id)) {
      payload.id = draft.id
    }

    const res = await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!json.success || !json.data?.id) {
      throw new Error('Form creation failed')
    }

    const created: Form = {
      id: json.data.id,
      name: json.data.name || fallbackName,
      description: json.data.description || fallbackDescription,
      submissionCount: json.data.submissionCount ?? json.data.submission_count ?? 0,
      createdAt: json.data.createdAt || json.data.created_at || new Date().toISOString(),
      eventId: json.data.eventId || json.data.event_id || '',
    }

    setForms((prev) => [created, ...prev.filter((form) => form.id !== created.id)])
    router.push(`/forms/${created.id}/edit`)
  }

  const handleFormCreated = async (newForm: FormDraft) => {
    try {
      await createFormAndOpenEditor(newForm)
    } catch (error) {
      console.error('Failed to create form from AI:', error)
      setForms((prev) => [
        ...prev,
        {
          ...newForm,
          id: newForm.id || crypto.randomUUID(),
          eventId: newForm.eventId || '',
          createdAt: new Date().toISOString(),
          submissionCount: 0,
        },
      ])
    }
    setShowAIChat(false)
  }

  const handleCreateWithAI = () => {
    setShowCreationModal(false)
    setShowAIChat(true)
  }

  const handleCreateManually = async () => {
    setShowCreationModal(false)
    const newForm: FormDraft = {
      id: crypto.randomUUID(),
      name: 'Untitled Form',
      description: '',
      eventId: '',
    }
    try {
      await createFormAndOpenEditor(newForm)
    } catch (error) {
      console.error('Failed to create manual form:', error)
      const fallbackId = newForm.id || crypto.randomUUID()
      setForms((prev) => [
        ...prev,
        {
          id: fallbackId,
          name: newForm.name,
          description: newForm.description,
          eventId: newForm.eventId || '',
          createdAt: new Date().toISOString(),
          submissionCount: 0,
        },
      ])
      router.push(`/forms/${fallbackId}/edit`)
    }
  }

  const totalForms = forms.length
  const totalSubmissions = forms.reduce((total, form) => total + form.submissionCount, 0)
  const formsWithResponses = forms.filter((form) => form.submissionCount > 0).length
  const latestFormDate = forms.length
    ? new Date(Math.max(...forms.map((form) => new Date(form.createdAt).getTime()))).toLocaleDateString()
    : 'No data'

  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-64 border-r border-border bg-card p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">AI Workspace</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/10 text-primary">
            <Home size={20} />
            <span className="font-medium">Home</span>
          </div>
          <Link
            href="/invitation-emails"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Mail size={20} />
            <span className="font-medium">Invitation Emails</span>
          </Link>
          <Link
            href="/post-generator"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Sparkles size={20} />
            <span className="font-medium">Post Generator</span>
          </Link>
          <Link
            href="/timeline-generator"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <CalendarRange size={20} />
            <span className="font-medium">Event Timeline</span>
          </Link>
          <Link
            href="/volunteer-assignments"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <UserCheck size={20} />
            <span className="font-medium">Volunteer Tasks</span>
          </Link>
          <Link
            href="/reminder-schedule"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <CalendarClock size={20} />
            <span className="font-medium">Reminder Schedule</span>
          </Link>
        </nav>

        <div className="border-t border-border pt-4" />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card px-8 py-6 flex justify-between items-center gap-3">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Home Dashboard</h2>
            <p className="text-muted-foreground text-sm mt-1">Dataset metrics, form creation, and AI content tools</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/invitation-emails">
                <Mail size={16} />
                Invite
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/post-generator">
                <Sparkles size={16} />
                Post
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/timeline-generator">
                <CalendarRange size={16} />
                Event Timeline
              </Link>
            </Button>
            <Button onClick={() => setShowCreationModal(true)} size="lg" className="gap-2">
              <Plus size={20} />
              New Form
            </Button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground">Dataset Dashboard</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Total Forms</p>
                <p className="text-3xl font-bold mt-2">{totalForms}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-3xl font-bold mt-2">{totalSubmissions}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Forms With Data</p>
                <p className="text-3xl font-bold mt-2">{formsWithResponses}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Latest Form Date</p>
                <p className="text-xl font-semibold mt-3">{latestFormDate}</p>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground">Form Creation Site</h3>
            </div>
            {forms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 border border-border rounded-xl bg-card">
                <div className="text-center">
                  <h4 className="text-xl font-semibold mb-2 text-foreground">
                    {loading ? 'Loading forms...' : 'No forms yet'}
                  </h4>
                  <p className="text-muted-foreground mb-6">
                    {loading ? 'Please wait while we load your workspace.' : 'Create your first form to get started'}
                  </p>
                  <Button onClick={() => setShowCreationModal(true)} className="gap-2">
                    <Plus size={18} />
                    Create Form
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map((form: Form) => (
                  <Card key={form.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between p-6">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-lg">{form.name}</h4>
                        <p className="text-muted-foreground text-sm mt-1">{form.description}</p>
                        <p className="text-muted-foreground text-xs mt-2">{form.submissionCount} submissions</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/forms/${form.id}/edit`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Edit2 size={16} />
                            Edit
                          </Button>
                        </Link>
                        <Link href={`/forms/${form.id}/responses`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Eye size={16} />
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteForm(form.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground">Communication and Operations</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <Card className="p-6">
                <h4 className="text-lg font-semibold">Invitation Emails</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate polished invite subject lines and body copy with RSVP details.
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/invitation-emails" className="gap-2">
                      <Mail size={16} />
                      Open Invitation Emails
                    </Link>
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="text-lg font-semibold">AI Post Generator</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate social posts with platform, tone, and keyword controls.
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/post-generator" className="gap-2">
                      <Sparkles size={16} />
                      Open Post Generator
                    </Link>
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="text-lg font-semibold">Event Timeline</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Build structured event timelines with dated milestones.
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/timeline-generator" className="gap-2">
                      <CalendarRange size={16} />
                      Open Event Timeline
                    </Link>
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="text-lg font-semibold">Volunteer Task Assignments</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Assign tasks to volunteers with backup owners in one click.
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/volunteer-assignments" className="gap-2">
                      <UserCheck size={16} />
                      Open Volunteer Tasks
                    </Link>
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="text-lg font-semibold">Reminder Schedule</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Create a complete reminder sequence before and after event day.
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/reminder-schedule" className="gap-2">
                      <CalendarClock size={16} />
                      Open Reminder Schedule
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          </section>
        </div>
      </div>

      {showCreationModal && (
        <FormCreationModal
          onAI={handleCreateWithAI}
          onManual={handleCreateManually}
          onClose={() => setShowCreationModal(false)}
        />
      )}

      {showAIChat && (
        <AIWorkflowChat
          onClose={() => setShowAIChat(false)}
          onFormCreated={handleFormCreated}
        />
      )}
    </div>
  )
}
