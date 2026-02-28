import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, hasJsonContentType, isTrustedOrigin, sanitizeInput } from '@/lib/security'
import { getFormById, updateForm } from '@/lib/supabase-store'

type FormField = {
  id: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  options?: string[]
}

const MAX_SHEET_NAME_LENGTH = 120
const MAX_REQUEST_BYTES = Number(process.env.MAX_JSON_PAYLOAD_BYTES || 100_000)

function isPayloadTooLarge(value: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_REQUEST_BYTES
  } catch {
    return true
  }
}

function buildMockSheetUrl(sheetName: string) {
  const slug = sheetName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  const token = `${slug || 'sheet'}-${crypto.randomUUID().replace(/-/g, '')}`
  return `https://docs.google.com/spreadsheets/d/${token}`
}

export async function POST(
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
    const sheetName = typeof body.sheetName === 'string' ? body.sheetName.trim() : ''

    if (!sheetName) {
      return NextResponse.json({ error: 'sheetName is required' }, { status: 400 })
    }
    if (sheetName.length > MAX_SHEET_NAME_LENGTH) {
      return NextResponse.json(
        { error: `sheetName cannot exceed ${MAX_SHEET_NAME_LENGTH} characters` },
        { status: 400 }
      )
    }

    const form = await getFormById(id)
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const existingConfig = (form.form_config || {}) as Record<string, unknown>
    const existingFields = Array.isArray((form.form_config as { fields?: unknown }).fields)
      ? ((form.form_config as { fields: FormField[] }).fields)
      : []
    const existingSheet = existingConfig.googleSheet as
      | { url?: string }
      | undefined

    const googleSheet = {
      name: sheetName,
      url: typeof existingSheet?.url === 'string' ? existingSheet.url : buildMockSheetUrl(sheetName),
      connected: true,
      connectedAt: new Date().toISOString(),
    }

    const updated = await updateForm(id, {
      form_config: {
        ...existingConfig,
        fields: existingFields,
        googleSheet,
      },
    })

    if (!updated) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        googleSheet,
      },
    })
  } catch (error) {
    console.error('Error connecting Google Sheet:', error)
    return NextResponse.json({ error: 'Failed to connect Google Sheet' }, { status: 500 })
  }
}
