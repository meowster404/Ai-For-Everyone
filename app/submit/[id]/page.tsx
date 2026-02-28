'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { FormFieldRenderer } from '@/components/form-field-renderer'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface FormField {
  id: string
  label: string
  type:
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
  required: boolean
  placeholder?: string
  options?: string[]
}

interface FormData {
  id: string
  name: string
  description: string
  fields: FormField[]
}

export default function FormSubmissionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const formId = Array.isArray(params.id) ? params.id[0] : params.id
  const { toast } = useToast()
  const [form, setForm] = useState<FormData | null>(null)
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!formId) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`/api/forms/${formId}`)
        const json = await res.json()
        if (json.success && json.data) {
          setForm(json.data)
        }
      } catch (err) {
        console.error('Failed to load form', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [formId])

  const handleChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const validateForm = (): boolean => {
    if (!form) return false
    for (const field of form.fields) {
      if (field.required && !formValues[field.id]) {
        toast({
          title: 'Validation Error',
          description: `${field.label} is required`,
          action: undefined,
        })
        return false
      }

      if (field.type === 'email' && formValues[field.id]) {
        const email = String(formValues[field.id])
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          toast({
            title: 'Validation Error',
            description: 'Please enter a valid email address',
            action: undefined,
          })
          return false
        }
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: form?.id,
          submissionData: formValues,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit form')
      }

      toast({
        title: 'Success',
        description: 'Your form has been submitted successfully!',
        action: undefined,
      })

      setFormValues({})
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit the form. Please try again.',
        action: undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading form...</p>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground font-semibold mb-4">Form not found</p>
          <Link href="/">
            <Button variant="outline">Go back home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 md:px-8 py-4 md:py-6">
        <Link href="/">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </Link>
        <h1 className="text-5xl md:text-6xl font-bold leading-none tracking-tight text-foreground mb-2">
          {form.name}
        </h1>
        {form.description && (
          <p className="text-base md:text-xl font-normal text-muted-foreground">
            {form.description}
          </p>
        )}
      </div>

      {/* Form Content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {form.fields.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">This form has no fields yet.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {form.fields.map((field) => (
                <FormFieldRenderer
                  key={field.id}
                  fieldId={field.id}
                  label={field.label || 'Question'}
                  type={field.type}
                  required={field.required}
                  options={field.options}
                  value={formValues[field.id]}
                  onChange={(value) => handleChange(field.id, value)}
                />
              ))}

              <div className="pt-8 flex items-center gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                  <span className="ml-1">{'->'}</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

