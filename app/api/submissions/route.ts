import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, hasJsonContentType, sanitizeInput } from '@/lib/security'
import { createSubmission, getFormById, listSubmissionsByFormId } from '@/lib/supabase-store'

const MAX_REQUEST_BYTES = Number(process.env.MAX_JSON_PAYLOAD_BYTES || 100_000)
const MAX_SUBMISSION_FIELDS = Number(process.env.MAX_SUBMISSION_FIELDS || 200)
const MAX_SUBMISSION_VALUE_LENGTH = Number(process.env.MAX_SUBMISSION_VALUE_LENGTH || 4000)

function isPayloadTooLarge(value: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_REQUEST_BYTES
  } catch {
    return true
  }
}

function isSubmissionDataSafe(submissionData: Record<string, unknown>) {
  const entries = Object.entries(submissionData)
  if (entries.length > MAX_SUBMISSION_FIELDS) {
    return false
  }

  for (const [key, value] of entries) {
    if (key.length === 0 || key.length > 120) {
      return false
    }
    if (typeof value === 'string' && value.length > MAX_SUBMISSION_VALUE_LENGTH) {
      return false
    }
  }

  return true
}

function normalizeSubmissionResponse(submission: {
  id: string
  form_id: string
  submission_data: Record<string, unknown>
  payment_status: 'pending' | 'completed' | 'failed'
  payment_id?: string
  payment_method?: string
  payment_amount?: number
  receipt_url?: string
  created_at: string
  updated_at: string
}) {
  return {
    ...submission,
    formId: submission.form_id,
    submissionData: submission.submission_data,
    paymentStatus: submission.payment_status,
    paymentId: submission.payment_id,
    paymentMethod: submission.payment_method,
    paymentAmount: submission.payment_amount,
    receiptUrl: submission.receipt_url,
    createdAt: submission.created_at,
    updatedAt: submission.updated_at,
  }
}

// GET /api/submissions?formId=xxx - Get submissions for a form
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const searchParams = request.nextUrl.searchParams
    const formId = sanitizeInput(searchParams.get('formId'))

    if (!formId) {
      return NextResponse.json({ error: 'formId query parameter is required' }, { status: 400 })
    }

    const form = await getFormById(formId)
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const submissions = (await listSubmissionsByFormId(formId)).map(normalizeSubmissionResponse)
    return NextResponse.json({
      success: true,
      data: submissions,
    })
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}

// POST /api/submissions - Create a new form submission
export async function POST(request: NextRequest) {
  try {
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
    const { formId, submissionData } = sanitizeInput(raw)

    if (!formId || !submissionData) {
      return NextResponse.json(
        { error: 'formId and submissionData are required' },
        { status: 400 }
      )
    }

    if (!(await getFormById(formId))) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (typeof submissionData !== 'object' || Array.isArray(submissionData)) {
      return NextResponse.json({ error: 'submissionData must be an object' }, { status: 400 })
    }
    if (!isSubmissionDataSafe(submissionData as Record<string, unknown>)) {
      return NextResponse.json({ error: 'Invalid or too large submission payload' }, { status: 400 })
    }

    const newSubmission = await createSubmission({
      formId,
      submissionData: submissionData as Record<string, unknown>,
      paymentStatus: 'pending',
    })

    return NextResponse.json({
      success: true,
      data: normalizeSubmissionResponse(newSubmission),
    })
  } catch (error) {
    console.error('Error creating submission:', error)
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
  }
}
