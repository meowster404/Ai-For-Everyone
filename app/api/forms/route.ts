import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, hasJsonContentType, isTrustedOrigin, sanitizeInput } from '@/lib/security'
import { createForm, getFormByIdOrCustomLink, listForms } from '@/lib/supabase-store'

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

// GET /api/forms - Get all forms for the user
export async function GET(_request: NextRequest) {
  try {
    const forms = (await listForms()).map(normalizeFormResponse)
    return NextResponse.json({
      success: true,
      data: forms,
    })
  } catch (error) {
    console.error('Error fetching forms:', error)
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
  }
}

// POST /api/forms - Create a new form
export async function POST(request: NextRequest) {
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

    const raw = await request.json()
    if (isPayloadTooLarge(raw)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const body = sanitizeInput(raw)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description =
      typeof body.description === 'string' ? body.description.trim() : ''
    const eventId =
      typeof body.eventId === 'string' && body.eventId.trim().length > 0
        ? body.eventId.trim()
        : null

    const fields = Array.isArray(body.fields) ? body.fields : []
    const baseFormConfig =
      body.formConfig && typeof body.formConfig === 'object'
        ? (body.formConfig as Record<string, unknown>)
        : {}
    const formConfig: Record<string, unknown> = {
      ...baseFormConfig,
      fields,
    }
    const rawCustomLink =
      typeof formConfig['customLink'] === 'string'
        ? (formConfig['customLink'] as string)
        : ''
    const normalizedCustomLink = normalizeCustomLink(rawCustomLink)
    const googleSheetConfig = formConfig['googleSheet']
    const id = typeof body.id === 'string' && body.id.trim().length > 0 ? body.id : undefined

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Name cannot exceed ${MAX_NAME_LENGTH} characters` }, { status: 400 })
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
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
      return NextResponse.json(
        { error: 'Invalid googleSheet configuration' },
        { status: 400 }
      )
    }
    if (normalizedCustomLink) {
      const existingByLink = await getFormByIdOrCustomLink(normalizedCustomLink)
      if (existingByLink && existingByLink.id !== id) {
        return NextResponse.json({ error: 'customLink is already in use' }, { status: 409 })
      }
      formConfig['customLink'] = normalizedCustomLink
    }

    const newForm = await createForm({
      id,
      name,
      description,
      eventId,
      formConfig,
    })

    return NextResponse.json({
      success: true,
      data: normalizeFormResponse(newForm),
    })
  } catch (error) {
    console.error('Error creating form:', error)
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 })
  }
}
