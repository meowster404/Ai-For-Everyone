import { randomUUID } from 'node:crypto'

import { generateJson } from '@/lib/ai'
import {
  applyRequestGuards,
  jsonError,
  jsonSuccess,
  parseJsonBody,
  sanitizeSingleLine,
} from '@/lib/api-security'

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

type GenerateFormBody = {
  prompt?: string
  maxFields?: number | string
}

type GeneratedFieldDraft = {
  label?: unknown
  type?: unknown
  required?: unknown
  options?: unknown
}

type GeneratedFormDraft = {
  name?: unknown
  description?: unknown
  fields?: unknown
}

const OPTION_FIELD_TYPES = new Set<FormFieldType>(['checkbox', 'radio', 'select', 'ranking'])

const TYPE_ALIASES: Record<string, FormFieldType> = {
  text: 'text',
  shorttext: 'text',
  shortanswer: 'text',
  email: 'email',
  number: 'number',
  numeric: 'number',
  textarea: 'textarea',
  longtext: 'textarea',
  paragraph: 'textarea',
  checkbox: 'checkbox',
  checkboxes: 'checkbox',
  radio: 'radio',
  radiobutton: 'radio',
  radiogroup: 'radio',
  select: 'select',
  dropdown: 'select',
  date: 'date',
  time: 'time',
  phone: 'phone',
  tel: 'phone',
  link: 'link',
  url: 'link',
  upload: 'upload',
  file: 'upload',
  rating: 'rating',
  payment: 'payment',
  signature: 'signature',
  linearscale: 'linear-scale',
  matrix: 'matrix',
  ranking: 'ranking',
}

function normalizeType(raw: unknown): FormFieldType {
  if (typeof raw !== 'string') return 'text'
  const normalized = raw.toLowerCase().replace(/[^a-z]/g, '')
  return TYPE_ALIASES[normalized] || 'text'
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() || ''}${word.slice(1).toLowerCase()}`)
    .join(' ')
}

function deriveFormName(prompt: string) {
  const concise = prompt
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(' ')

  if (!concise) return 'AI Generated Form'

  const normalized = toTitleCase(concise)
  return normalized.toLowerCase().includes('form') ? normalized : `${normalized} Form`
}

function sanitizeOptions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined

  const cleaned = value
    .map((item) => sanitizeSingleLine(item, 80))
    .filter(Boolean)
    .slice(0, 10)

  return cleaned.length ? cleaned : undefined
}

function fallbackFieldsFromPrompt(prompt: string, maxFields: number): FormField[] {
  const text = prompt.toLowerCase()
  const fields: Array<Omit<FormField, 'id'>> = [
    { label: 'Full Name', type: 'text', required: true },
    { label: 'Email', type: 'email', required: true },
  ]

  if (text.includes('phone') || text.includes('call') || text.includes('whatsapp')) {
    fields.push({ label: 'Phone Number', type: 'phone', required: false })
  }

  if (text.includes('date') || text.includes('schedule') || text.includes('event')) {
    fields.push({ label: 'Preferred Date', type: 'date', required: false })
  }

  if (text.includes('time') || text.includes('slot')) {
    fields.push({ label: 'Preferred Time', type: 'time', required: false })
  }

  if (text.includes('budget') || text.includes('amount') || text.includes('payment') || text.includes('price')) {
    fields.push({ label: 'Payment Amount', type: 'payment', required: false })
  }

  if (text.includes('feedback') || text.includes('review') || text.includes('comment')) {
    fields.push({ label: 'Feedback', type: 'textarea', required: false })
    fields.push({ label: 'Rating', type: 'rating', required: false })
  }

  if (text.includes('attendance') || text.includes('attend') || text.includes('yes/no')) {
    fields.push({
      label: 'Attendance Confirmation',
      type: 'select',
      required: true,
      options: ['Yes', 'No', 'Maybe'],
    })
  }

  if (text.includes('role') || text.includes('department')) {
    fields.push({
      label: 'Role',
      type: 'select',
      required: false,
      options: ['Volunteer', 'Organizer', 'Speaker'],
    })
  }

  const uniqueByLabel = new Map<string, Omit<FormField, 'id'>>()
  for (const field of fields) {
    const key = field.label.toLowerCase()
    if (!uniqueByLabel.has(key)) {
      uniqueByLabel.set(key, field)
    }
  }

  return Array.from(uniqueByLabel.values())
    .slice(0, maxFields)
    .map((field) => ({
      ...field,
      id: randomUUID(),
    }))
}

function normalizeGeneratedFields(rawFields: unknown, maxFields: number): FormField[] {
  if (!Array.isArray(rawFields)) return []

  const normalized: FormField[] = []

  for (const candidate of rawFields) {
    if (!candidate || typeof candidate !== 'object') continue

    const fieldDraft = candidate as GeneratedFieldDraft
    const label = sanitizeSingleLine(fieldDraft.label, 120)
    if (!label) continue

    const type = normalizeType(fieldDraft.type)
    const required = Boolean(fieldDraft.required)
    const options = sanitizeOptions(fieldDraft.options)

    normalized.push({
      id: randomUUID(),
      label,
      type,
      required,
      options: OPTION_FIELD_TYPES.has(type) ? options || ['Option 1', 'Option 2'] : undefined,
    })

    if (normalized.length >= maxFields) break
  }

  const deduped = new Map<string, FormField>()
  for (const field of normalized) {
    const key = `${field.label.toLowerCase()}::${field.type}`
    if (!deduped.has(key)) {
      deduped.set(key, field)
    }
  }

  return Array.from(deduped.values())
}

export async function POST(request: Request) {
  const guardFailure = applyRequestGuards(request, {
    routeKey: 'generate-form',
    maxBodyBytes: 12_288,
    maxRequests: 20,
    windowMs: 60_000,
  })
  if (guardFailure) return guardFailure

  const parsedBody = await parseJsonBody<GenerateFormBody>(request)
  if (!parsedBody.ok) return parsedBody.response

  const body = parsedBody.data
  const prompt = sanitizeSingleLine(body.prompt, 2000)
  const maxFieldsRaw = Number(body.maxFields ?? 12)
  const maxFields = Number.isFinite(maxFieldsRaw)
    ? Math.max(1, Math.min(30, Math.floor(maxFieldsRaw)))
    : 12

  if (prompt.length < 10) {
    return jsonError('Prompt is required and must contain at least 10 characters.', 400)
  }

  const aiDraft = await generateJson<GeneratedFormDraft>({
    system:
      'You create form schemas. Return strict JSON object with keys: name (string), description (string), fields (array). Each field: label (string), type (one of text,email,number,textarea,checkbox,radio,select,date,time,phone,link,upload,rating,payment,signature,linear-scale,matrix,ranking), required (boolean), options (string[] only for checkbox/radio/select/ranking). No markdown. No extra keys.',
    user: JSON.stringify({
      task: 'Generate a complete form from this user prompt.',
      prompt,
      maxFields,
    }),
    temperature: 0.35,
    maxTokens: 1400,
  })

  const generatedName = sanitizeSingleLine(aiDraft?.name, 120)
  const generatedDescription = sanitizeSingleLine(aiDraft?.description, 1500)
  const aiFields = normalizeGeneratedFields(aiDraft?.fields, maxFields)

  const fallbackFields = fallbackFieldsFromPrompt(prompt, maxFields)
  const fields = aiFields.length > 0 ? aiFields : fallbackFields

  return jsonSuccess({
    name: generatedName || deriveFormName(prompt),
    description: generatedDescription || prompt,
    fields,
    generatedWith: aiFields.length > 0 ? 'ai' : 'fallback',
  })
}
