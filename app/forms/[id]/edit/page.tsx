'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FieldSelector } from '@/components/field-selector'
import { FormFieldRenderer } from '@/components/form-field-renderer'
import { ArrowLeft, BarChart3, Copy, ExternalLink, Link2, PlugZap, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

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

interface FormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder?: string
  options?: string[]
}

const optionFieldTypes = new Set<FormFieldType>(['select', 'radio', 'checkbox', 'ranking'])

function normalizeCustomLink(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
}

function buildField(type: FormFieldType): FormField {
  return {
    id: crypto.randomUUID(),
    label: '',
    type,
    required: false,
    options: optionFieldTypes.has(type) ? ['Option 1', 'Option 2'] : undefined,
  }
}

export default function FormEditorPage() {
  const params = useParams<{ id: string }>()
  const formId = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()

  const [formName, setFormName] = useState('Untitled Form')
  const [formDescription, setFormDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [origin, setOrigin] = useState('')
  const [customLink, setCustomLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)

    const handleKeyDown = (event: KeyboardEvent) => {
      const targetTag = (event.target as HTMLElement).tagName
      if (event.key === '/' && targetTag !== 'INPUT' && targetTag !== 'TEXTAREA') {
        event.preventDefault()
        setShowFieldSelector(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!formId) return

    const loadForm = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}`)
        const json = await response.json()
        if (!json.success || !json.data) return

        const data = json.data as {
          name?: string
          description?: string
          fields?: FormField[]
          formConfig?: { fields?: FormField[]; customLink?: string }
          form_config?: { fields?: FormField[]; customLink?: string }
        }

        const loadedFields = Array.isArray(data.fields)
          ? data.fields
          : Array.isArray(data.formConfig?.fields)
            ? data.formConfig.fields
            : Array.isArray(data.form_config?.fields)
              ? data.form_config.fields
              : []

        setFormName(data.name || 'Untitled Form')
        setFormDescription(data.description || '')
        setFields(loadedFields)
        setCustomLink(data.formConfig?.customLink || data.form_config?.customLink || '')
      } catch (error) {
        console.error('Failed to load form:', error)
      }
    }

    loadForm()
  }, [formId])

  useEffect(() => {
    if (fields.length === 0) {
      setSelectedFieldId(null)
      return
    }

    if (!selectedFieldId || !fields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(fields[0].id)
    }
  }, [fields, selectedFieldId])

  const customPath = useMemo(() => normalizeCustomLink(customLink), [customLink])
  const formPublicPath = customPath || formId || ''
  const publicFormUrl = useMemo(
    () => (origin && formPublicPath ? `${origin}/submit/${formPublicPath}` : ''),
    [origin, formPublicPath]
  )

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null
  const selectedFieldOptions = selectedField?.options || []
  const selectedFieldIsOptionType = !!selectedField && optionFieldTypes.has(selectedField.type)

  const handleSelectField = (fieldType: { type?: FormFieldType }) => {
    const nextType = fieldType.type || 'text'
    const nextField = buildField(nextType)
    setFields((prev) => [...prev, nextField])
    setSelectedFieldId(nextField.id)
  }

  const handleDeleteField = (id: string) => {
    setFields((prev) => prev.filter((field) => field.id !== id))
    if (selectedFieldId === id) {
      setSelectedFieldId(null)
    }
  }

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...updates } : field)))
  }

  const updateSelectedField = (updates: Partial<FormField>) => {
    if (!selectedFieldId) return
    handleUpdateField(selectedFieldId, updates)
  }

  const handleAddOption = () => {
    const nextOptions = [...selectedFieldOptions, `Option ${selectedFieldOptions.length + 1}`]
    updateSelectedField({ options: nextOptions })
  }

  const handleOptionChange = (index: number, value: string) => {
    const nextOptions = [...selectedFieldOptions]
    nextOptions[index] = value
    updateSelectedField({ options: nextOptions })
  }

  const handleRemoveOption = (index: number) => {
    const nextOptions = selectedFieldOptions.filter((_, optionIndex) => optionIndex !== index)
    updateSelectedField({ options: nextOptions })
  }

  const handleCopyPublicLink = async () => {
    if (!publicFormUrl) return
    try {
      await navigator.clipboard.writeText(publicFormUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Could not copy link:', error)
    }
  }

  const persistForm = async () => {
    if (!formId) {
      throw new Error('Invalid form ID')
    }

    const payload = {
      id: formId,
      name: formName,
      description: formDescription,
      fields,
      formConfig: {
        customLink: customPath,
      },
    }

    const updateResponse = await fetch(`/api/forms/${formId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (updateResponse.ok) {
      return updateResponse.json()
    }

    const createResponse = await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return createResponse.json()
  }

  const handleSaveForm = async () => {
    setIsSaving(true)
    try {
      const json = await persistForm()
      if (!json.success) throw new Error('Save failed')
      alert('Form saved as draft')
    } catch (error) {
      console.error('Error saving form', error)
      alert('Failed to save form')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    setIsSaving(true)
    try {
      const json = await persistForm()
      if (!json.success) throw new Error('Publish failed')
      setIsPublished(true)
      router.push(`/forms/${formId}/integrate`)
    } catch (error) {
      console.error('Error publishing form', error)
      alert('Failed to publish form')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background flex-col lg:flex-row">
      <div className="w-full lg:w-85 border-b lg:border-b-0 lg:border-r border-border bg-card p-4 md:p-5 flex flex-col">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 mb-5">
            <ArrowLeft size={18} />
            Back
          </Button>
        </Link>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground mb-1 text-xl">Form Settings</h3>
            <p className="text-xs text-muted-foreground">
              Manage links, integrations, and field behavior.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/90 flex items-center gap-2">
              <Link2 size={14} />
              Custom Form Link
            </label>
            <div className="text-xs text-muted-foreground break-all">/submit/{formPublicPath || 'your-link'}</div>
            <input
              value={customLink}
              onChange={(event) => setCustomLink(event.target.value)}
              placeholder="custom-link"
              className="w-full border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary rounded-none"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyPublicLink}
                className="flex-1 gap-1"
                disabled={!publicFormUrl}
              >
                <Copy size={14} />
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Link href={formPublicPath ? `/submit/${formPublicPath}` : '#'} target="_blank" className="flex-1">
                <Button type="button" size="sm" variant="outline" className="w-full gap-1" disabled={!formPublicPath}>
                  <ExternalLink size={14} />
                  Open
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <Link href={`/forms/${formId}/integrate`}>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <PlugZap size={15} />
                Integrations
              </Button>
            </Link>
            <Link href={`/forms/${formId}/responses`}>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <BarChart3 size={15} />
                Responses
              </Button>
            </Link>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <label className="text-xs font-medium text-foreground/90">Field Options</label>
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add at least one field to unlock options.</p>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedFieldId || ''}
                  onChange={(event) => setSelectedFieldId(event.target.value)}
                  className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {fields.map((field, index) => (
                    <option key={field.id} value={field.id} className="bg-background text-foreground">
                      {field.label || `Untitled ${index + 1}`}
                    </option>
                  ))}
                </select>

                {selectedField && (
                  <div className="space-y-2">
                    <input
                      value={selectedField.label}
                      onChange={(event) => updateSelectedField({ label: event.target.value })}
                      placeholder="Question label"
                      className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary"
                    />

                    <label className="flex items-center gap-2 text-xs text-foreground/90">
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        onChange={(event) => updateSelectedField({ required: event.target.checked })}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      Required field
                    </label>

                    {selectedFieldIsOptionType && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Choices</div>
                        {selectedFieldOptions.map((option, index) => (
                          <div key={`${selectedField.id}-option-${index}`} className="flex gap-2">
                            <input
                              value={option}
                              onChange={(event) => handleOptionChange(index, event.target.value)}
                              className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="px-2 text-destructive"
                              onClick={() => handleRemoveOption(index)}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" size="sm" variant="outline" className="w-full" onClick={handleAddOption}>
                          Add option
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border bg-card px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-3xl font-bold text-foreground">Edit Form</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isPublished ? 'Published' : 'Draft'} | Customize your form fields and settings
            </p>
          </div>
          <div className="flex gap-2 md:gap-4">
            <Button onClick={handleSaveForm} disabled={isSaving} variant="outline" size="lg">
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isSaving}
              size="lg"
              className="gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              {isSaving ? 'Publishing...' : 'Publish'}
              <span>{'->'}</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="space-y-1 pb-5 border-b border-border">
                <input
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Form title"
                  className="w-full bg-transparent border-0 p-0 text-6xl md:text-7xl font-bold leading-none tracking-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
                <textarea
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  placeholder="Add a description..."
                  className="w-full bg-transparent border-0 p-0 text-xl md:text-2xl font-normal text-foreground/85 placeholder:text-muted-foreground/50 focus:outline-none resize-none"
                  rows={1}
                />
              </div>

              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="group relative py-5 cursor-pointer"
                    onClick={() => setSelectedFieldId(field.id)}
                  >
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(event) => handleUpdateField(field.id, { label: event.target.value })}
                        onClick={(event) => event.stopPropagation()}
                        placeholder={`Question ${index + 1}`}
                        className="w-full bg-transparent border-0 p-0 text-base md:text-lg font-medium text-foreground/95 placeholder:text-muted-foreground/55 focus:outline-none"
                      />
                      <FormFieldRenderer
                        fieldId={field.id}
                        label={field.label || `field-${field.id}`}
                        type={field.type}
                        required={field.required}
                        options={field.options}
                        showLabel={false}
                      />
                    </div>

                    <div className="absolute right-0 top-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteField(field.id)
                        }}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setShowFieldSelector(true)}
                  className="w-full rounded-lg border border-dashed border-border px-4 py-5 text-left hover:border-primary/60 hover:bg-muted/30 transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground">Add a field</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Open full field list with all options. Shortcut: press "/"
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFieldSelector && (
        <FieldSelector onSelect={handleSelectField} onClose={() => setShowFieldSelector(false)} />
      )}
    </div>
  )
}
