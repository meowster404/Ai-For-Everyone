import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, hasJsonContentType, isTrustedOrigin, sanitizeInput } from '@/lib/security'
import { deleteForm, getFormById, getFormByIdOrCustomLink, updateForm } from '@/lib/supabase-store'

const MAX_NAME_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_FORM_FIELDS = Number(process.env.MAX_FORM_FIELDS || 50)
const MAX_REQUEST_BYTES = Number(process.env.MAX_JSON_PAYLOAD_BYTES || 100_000)
const CUSTOM_LINK_REGEX = /^[a-z0-9][a-z0-9-_]{0,79}$/i
const ALLOWED_FIELD_TYPES = new Set([
  'text',
  'email',
  'number',
  'textarea',
  'checkbox',
  'radio',
  'select',
  'date',
  'time',
  'phone',
  'link',
  'upload',
  'rating',
  'payment',
  'signature',
  'linear-scale',
  'matrix',
  'ranking',
])

function isPayloadTooLarge(value: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_REQUEST_BYTES
  } catch {
    return true
  }
}

function normalizeCustomLink(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

function isGoogleSheetConfigValid(value: unknown) {
  if (value === undefined) return true
  if (!value || typeof value !== 'object') return false

  const candidate = value as {
    name?: unknown
    url?: unknown
    connected?: unknown
    connectedAt?: unknown
  }

  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0 || candidate.name.length > 120) {
    return false
  }
  if (typeof candidate.url !== 'string' || candidate.url.length > 500) {
    return false
  }
  try {
    const parsedUrl = new URL(candidate.url)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return false
    }
  } catch {
    return false
  }
  if (typeof candidate.connected !== 'boolean') {
    return false
  }
  if (candidate.connectedAt !== undefined && typeof candidate.connectedAt !== 'string') {
    return false
  }

  return true
}

function areFieldsValid(fields: unknown[]) {
  return fields.every((field) => {
    if (!field || typeof field !== 'object') return false
    const candidate = field as {
      id?: unknown
      label?: unknown
      type?: unknown
      required?: unknown
      options?: unknown
    }
    if (typeof candidate.id !== 'string' || candidate.id.length === 0) return false
    if (typeof candidate.label !== 'string') return false
    if (candidate.label.length > 120) return false
    if (typeof candidate.type !== 'string' || !ALLOWED_FIELD_TYPES.has(candidate.type)) return false
    if (typeof candidate.required !== 'boolean') return false
    if (
      candidate.options !== undefined &&
      (!Array.isArray(candidate.options) ||
        candidate.options.some((option) => typeof option !== 'string' || option.length > 120))
    ) {
      return false
    }
    return true
  })
}

function normalizeFormResponse(form: {
  id: string
  name: string
  description: string
  event_id: string | null
  form_config: Record<string, unknown>
  submission_count: number
  created_at: string
  updated_at: string
}) {
  return {
    ...form,
    eventId: form.event_id,
    formConfig: form.form_config,
    submissionCount: form.submission_count,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    fields: Array.isArray((form.form_config as { fields?: unknown }).fields)
      ? (form.form_config as { fields: unknown[] }).fields
      : [],
  }
}

// GET /api/forms/[id] - Get a specific form
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = sanitizeInput(rawId)
    const form = await getFormByIdOrCustomLink(id)
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: normalizeFormResponse(form),
    })
  } catch (error) {
    console.error('Error fetching form:', error)
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 })
  }
}

// PUT /api/forms/[id] - Update a form
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'Untrusted origin' }, { status: 403 })
    }
    if (!hasJsonContentType(request)) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
    }

    const ip = getClientIp(request)
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { id: rawId } = await params
    const id = sanitizeInput(rawId)
    const rawBody = await request.json()
    if (isPayloadTooLarge(rawBody)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    const body = sanitizeInput(rawBody)

    const existing = await getFormById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const nextName =
      typeof body.name === 'string' && body.name.trim().length > 0
        ? body.name.trim()
        : existing.name
    const nextDescription =
      typeof body.description === 'string' ? body.description.trim() : existing.description
    const nextEventId =
      typeof body.eventId === 'string' && body.eventId.trim().length > 0
        ? body.eventId.trim()
        : existing.event_id

    const fields = Array.isArray(body.fields)
      ? body.fields
      : Array.isArray((existing.form_config as { fields?: unknown }).fields)
        ? (existing.form_config as { fields: unknown[] }).fields
        : []

    const nextFormConfig =
      body.formConfig && typeof body.formConfig === 'object'
        ? { ...existing.form_config, ...body.formConfig, fields }
        : { ...existing.form_config, fields }
    const rawCustomLink =
      nextFormConfig && typeof (nextFormConfig as { customLink?: unknown }).customLink === 'string'
        ? (nextFormConfig as { customLink: string }).customLink
        : ''
    const normalizedCustomLink = normalizeCustomLink(rawCustomLink)
    const googleSheetConfig =
      (nextFormConfig as { googleSheet?: unknown }).googleSheet

    if (nextName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Name cannot exceed ${MAX_NAME_LENGTH} characters` }, { status: 400 })
    }
    if (nextDescription.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters` },
        { status: 400 }
      )
    }
    if (fields.length > MAX_FORM_FIELDS) {
      return NextResponse.json(
        { error: `A form can have at most ${MAX_FORM_FIELDS} fields` },
        { status: 400 }
      )
    }
    if (fields.length > 0 && !areFieldsValid(fields)) {
      return NextResponse.json({ error: 'Invalid field configuration' }, { status: 400 })
    }
    if (normalizedCustomLink && !CUSTOM_LINK_REGEX.test(normalizedCustomLink)) {
      return NextResponse.json(
        { error: 'customLink must be 1-80 chars and only include letters, numbers, - or _' },
        { status: 400 }
      )
    }
    if (!isGoogleSheetConfigValid(googleSheetConfig)) {
      return NextResponse.json({ error: 'Invalid googleSheet configuration' }, { status: 400 })
    }
    if (normalizedCustomLink) {
      const existingByLink = await getFormByIdOrCustomLink(normalizedCustomLink)
      if (existingByLink && existingByLink.id !== existing.id) {
        return NextResponse.json({ error: 'customLink is already in use' }, { status: 409 })
      }
      const formConfigRecord = nextFormConfig as Record<string, unknown>
      formConfigRecord.customLink = normalizedCustomLink
    }

    const updated = await updateForm(id, {
      name: nextName,
      description: nextDescription,
      event_id: nextEventId,
      form_config: nextFormConfig,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: normalizeFormResponse(updated),
    })
  } catch (error) {
    console.error('Error updating form:', error)
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 })
  }
}

// DELETE /api/forms/[id] - Delete a form
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'Untrusted origin' }, { status: 403 })
    }

    const ip = getClientIp(request)
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { id: rawId } = await params
    const id = sanitizeInput(rawId)
    const deleted = await deleteForm(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Form deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting form:', error)
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 })
  }
}
